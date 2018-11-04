const fs      = require('fs')
const path    = require('path')
const common  = require('lib/common')
const logger  = require('@rockholla/clia').logger
const childp  = require('child_process')

class CicdCommand {

  /**
   * Constructor that defines the command and description
   */
  constructor () {
    this.actions    = ['init', 'build', 'release']
    this.command    = `cicd <${this.actions.join('|')}>`
    this.desc       = 'A built-in CI server of sorts, for automating building, testing, SCM flow, and deployments'
  }

  /**
   * Command entrypoint, primary handler
   * @param {Object} argv - yargs arguments
   */
  handler (argv) {
    this[common.getArgvCommand(argv, this.actions)](argv).then(() => {}).catch((error) => {
      common.processError(error, argv)
    })
  }

  /**
   * Initializes the local CI/CD environment
   * @param {Object} argv - yargs arguments
   * @returns {Promise} promise result
   */
  init () {
    return new Promise((resolve, reject) => {
      try {
        logger.info('Copying pre-commit git hook in to place')
        const dest = path.resolve(__dirname, '..', '.githooks/pre-commit')
        fs.copyFileSync(dest, path.resolve(__dirname, '..', '.git/hooks/pre-commit'))
        fs.chmodSync(dest, '0775')
        return resolve()
      } catch (error) {
        return reject(error)
      }
    })
  }

  /**
   * Runs an npm script in the context of this shell
   * @param {string} name - the name of the script as defined in package.json
   * @param {boolean} failOnOutput - fail if there is any output
   */
  runNpmScript (name, failOnOutput = false) {
    return new Promise((resolve, reject) => {
      process.env.FORCE_COLOR = true
      const child = childp.spawn(`npm`, ['run', '--silent', name], { cwd: path.resolve(__dirname, '..'), env: process.env })
      let fail    = false
      let stdout  = ''
      let stderr  = ''
      child.stderr.on('data', (data) => {
        process.stderr.write(data)
        if (data.toString('utf8').trim() !== '' && failOnOutput) fail = true
        stdout += data
      })
      child.stdout.on('data', (data) => {
        process.stdout.write(data)
        if (data.toString('utf8').trim() !== '' && failOnOutput) fail = true
        stderr += data
      })
      child.on('close', (code) => {
        if (code !== 0 || fail) return reject(`${name} failed`)
        return resolve({
          stdout: stdout,
          stderr: stderr,
        })
      })
    })
  }

  /**
   * Lints/Tests the whole project, then builds the Go HTTP API
   * @param {Object} argv - yargs arguments
   * @returns {Promise} promise result
   */
  build () {
    logger.info('Linting code first')
    return this.runNpmScript('lint:node').then(() => {
      return this.runNpmScript('lint:go', true)
    }).then(() => {
      logger.info('Running tests')
      return this.runNpmScript('test')
    }).then(() => {
      logger.info('Building Go HTTP API binary')
      return this.runNpmScript('build')
    }).then(() => {
      logger.info('Building Go HTTP API docker image')
      common.exec(`docker build -t rockholla/go-http-api .`, { cwd: path.resolve(__dirname, '..', 'build') })
    })
  }

  /**
   * Builds and releases the Go HTTP API
   * @param {Object} argv - yargs arguments
   * @returns {Promise} promise result
   */
  release () {
    return this.build().then(() => {

    })
  }

}

const command = new CicdCommand()
module.exports = {
  command: command.command,
  desc: command.desc,
  handler: argv => {
    command.handler(argv)
  }
}
