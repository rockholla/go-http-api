const path      = require('path')
const fs        = require('fs')
const common    = require('./common')
const inquirer  = require('inquirer')

/**
 * Class for wrapping terraform execution tasks
 */
class Terraform {

  /**
   * Constructor
   * @param {Object} aws - an Aws object (lib/aws)
   */
  constructor (aws) {
    this.root = path.resolve(__dirname, '..', 'terraform')
    this.aws  = aws
  }

  /**
   * Helper for generating command line var arguments for Terraform commands
   * @param {Object} vars - a key/value object that will be translated to command line string vars
   * @returns {string} command line --var="..." string for use with Terraform commands
   */
  makeVarArgs (vars) {
    let args = ''
    Object.keys(vars).forEach((varName) => {
      if (vars.hasOwnProperty(varName)) {
        let quote = '"'
        if (vars[varName] && vars[varName].toString().indexOf(quote) >= 0) quote = "'"
        args += ` --var=${quote}${varName}=${vars[varName]}${quote}`
      }
    })
    return args.trim()
  }

  /**
   * Wrapper for terraform command execution
   * @param {string} command - the full terraform command
   * @param {string} modulePath - the path where the command will execute
   * @param {string} stateBucketPrefix - the name prefix for the state bucket, will always be suffixed by the AWS account ID
   * @returns {Promise} in the case of an apply, the promise resolves to an object of outputs, otherwise just the shelljs.exec result
   */
  execute (command, modulePath, stateBucketPrefix) {
    const _this       = this
    let planPath      = null
    const timestamp   = (+ new Date())
    const stateBucket = `${stateBucketPrefix}-${this.aws.accountId}`
    let env       = Object.assign(process.env, {
      AWS_ACCESS_KEY_ID: this.aws.getCredentials().accessKeyId,
      AWS_SECRET_ACCESS_KEY: this.aws.getCredentials().secretAccessKey,
      AWS_DEFAULT_REGION: this.aws.region
    })
    const _init = () => {
      const key = modulePath.replace(_this.root, '')
      common.exec(`terraform init -input=false -reconfigure ` +
                  `-backend-config="bucket=${stateBucket}" ` +
                  `-backend-config="region=${_this.aws.region}" ` +
                  `-backend-config="key=${key.trim() === "" ? "default" : key}"`, { cwd: modulePath, env: env })
    }
    const _apply = () => {
      let apply = common.exec(`terraform apply ${planPath}`, { cwd: modulePath, env: env })
      if (apply.code !== 0) {
        return Promise.reject('Error running terraform apply')
      }
      let output  = common.exec(`terraform output -json`, { cwd: modulePath, env: env, silent: true })
      if (output.code !== 0) {
        return Promise.reject('Error getting terraform output after apply')
      }
      if (fs.existsSync(planPath)) {
        fs.unlinkSync(planPath)
      }
      return Promise.resolve({
        exec: apply,
        outputs: JSON.parse(output.stdout.trim()),
      })
    }
    const _execute = () => {
      _init()
      if (command.match(/^apply/g)) {
        planPath = path.join(_this.root, '.tmp', timestamp.toString())
        let plan = common.exec(`terraform plan ${command.replace(/^apply/g, '').trim()} -out="${planPath}"`, { cwd: modulePath, env: env })
        if (plan.code !== 0) {
          return Promise.reject('Error running terraform plan')
        }
        if (plan.stdout.match(/No\schanges/g)) {
          return _apply()
        }
        return inquirer.prompt({
          name: 'continue',
          type: 'confirm',
          message: 'The above provides a summary of changes to be made on this apply, do you want to continue?'
        }).then((response) => {
          if (response.continue) {
            return _apply()
          } else {
            return Promise.reject(`Aborted without running the plan`)
          }
        })
      } else {
        let result = common.exec(`terraform ${command}${command.match(/^destroy/g) ? ' -auto-approve' : ''}`, { cwd: modulePath, env: env })
        if (result.code !== 0) {
          return Promise.reject('Error running terraform command')
        }
        if (command.match(/^show/g)) {
          let output = common.exec('terraform output -json', { cwd: modulePath, env: env, silent: true })
          return Promise.resolve({
            exec: result,
            outputs: JSON.parse(output.stdout.trim()),
          })
        }
        return Promise.resolve(result)
      }
    }
    return _execute().then((result) => {
      if (planPath && fs.existsSync(planPath)) {
        fs.unlinkSync(planPath)
      }
      return result
    })

  }

}

module.exports = Terraform
