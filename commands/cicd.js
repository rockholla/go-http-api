const fs          = require('fs')
const path        = require('path')
const common      = require('lib/common')
const logger      = require('@rockholla/clia').logger
const config      = require('@rockholla/clia').config
const childp      = require('child_process')
const inquirer    = require('inquirer')
const Aws         = require('lib/aws')
const Kubernetes  = require('lib/kubernetes')
const yaml        = require('node-yaml')

class CicdCommand {

  /**
   * Constructor that defines the command and description
   */
  constructor () {
    this.actions    = ['init', 'build', 'release']
    this.command    = `cicd <${this.actions.join('|')}> [--skip-deploy]`
    this.desc       = 'A built-in CI server of sorts, for automating building, testing, SCM flow, and deployments'
    this.aws        = null
  }

  /**
   * Command entrypoint, primary handler
   * @param {Object} argv - yargs arguments
   */
  handler (argv) {
    this.aws = new Aws(config.active.aws.profile)
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
      logger.info('Building Go HTTP API binary')
      return this.runNpmScript('build')
    }).then(() => {
      logger.info('Running tests')
      return this.runNpmScript('test')
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
  release (argv) {
    const root        = path.resolve(__dirname, '..')
    let packageJson   = require(path.resolve(root, 'package.json'))
    let currentBranch = common.exec('git rev-parse --abbrev-ref HEAD', { cwd: root }).trim()
    let kubernetes    = null
    if (common.exec('git status', { cwd: root }).indexOf('nothing to commit') === -1) {
      return Promise.reject(`The source currently contains unstaged commits. Please commit before running a release.`)
    }
    if (currentBranch !== 'develop') {
      return Promise.reject(`Please switch to the develop branch to run a release`)
    }
    return this.build().then(() => {
      return inquirer.prompt({
        type: 'list',
        name: 'releaseType',
        choices: ['Major', 'Minor', 'Patch'],
        message: 'What type of release is this?'
      })
    }).then((response) => {
      let version = packageJson.version.split('.')
      switch (response.releaseType) {
        case 'Major':
          version[0]++
          version[1] = 0
          version[2] = 0
          break
        case 'Minor':
          version[1]++
          version[2] = 0
          break
        case 'Patch':
          version[2]++
          break
        default:
          throw new Error(`Invalid release type ${response.releaseType}`)
      }
      common.exec('git pull origin develop', { cwd: root })
      packageJson.version = version.join('.')
      fs.writeFileSync(path.resolve(root, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n')
      common.exec('git add .', { cwd: root })
      common.exec(`git commit --no-verify -m "updating package.json to ${packageJson.version}"`)
      common.exec('git checkout master', { cwd: root })
      common.exec(`git merge ${currentBranch}`, { cwd: root })
      common.exec(`git checkout ${currentBranch}`, { cwd: root })
      common.exec(`git tag -a ${packageJson.version} -m "Tagging version ${packageJson.version}"`, { cwd: root })
      try {
        common.exec('git push --all origin', { cwd: root })
        common.exec('git push --tags origin', { cwd: root })
      } catch (error) {
        logger.warn('Unable to push branches/tags to the origin repository. This likely means you have no access.')
      }
    }).then(() => {
      if (!argv['skip-deploy']) {
        logger.info('Ensuring the AWS ECR repository exists')
        return this.aws.ensureEcrRepository('go-http-api')
      }
    }).then(() => {
      if (!argv['skip-deploy']) {
        logger.info('Tagging the Go HTTP API image for AWS ECR')
        common.exec(`docker tag rockholla/go-http-api:latest rockholla/go-http-api:${packageJson.version}`)
        common.exec(`docker tag rockholla/go-http-api:latest ${this.aws.accountId}.dkr.ecr.${this.aws.region}.amazonaws.com/go-http-api:latest`)
        common.exec(`docker tag rockholla/go-http-api:latest ${this.aws.accountId}.dkr.ecr.${this.aws.region}.amazonaws.com/go-http-api:${packageJson.version}`)
        logger.info('Logging in to push via docker')
        this.aws.loginToEcr()
        logger.info('Pushing to ECR')
        common.exec(`docker push ${this.aws.accountId}.dkr.ecr.${this.aws.region}.amazonaws.com/go-http-api:latest`)
        common.exec(`docker push ${this.aws.accountId}.dkr.ecr.${this.aws.region}.amazonaws.com/go-http-api:${packageJson.version}`)
      }
    }).then(() => {
      if (!argv['skip-deploy']) {
        kubernetes = new Kubernetes(this.aws, 'go-http-api')
        logger.info('Running the rolling upgrade deployment to the EKS cluster')
        let daemonSet = yaml.readSync(path.resolve(__dirname, '..', 'build', 'kubernetes', 'daemonset.template.yml'))
        daemonSet.spec.template.metadata.labels.version = packageJson.version
        daemonSet.spec.template.spec.containers[0].image = `${this.aws.accountId}.dkr.ecr.${this.aws.region}.amazonaws.com/go-http-api:latest`
        const dest = path.resolve(__dirname, '..', 'build', 'kubernetes', 'daemonset.yml')
        yaml.writeSync(dest, daemonSet)
        kubernetes.apply(dest)
        kubernetes.apply(path.resolve(__dirname, '..', 'build', 'kubernetes', 'service.yml'))
        logger.info(`Rolling upgrade initiatated. Monitoring status...`)
        return kubernetes.waitForRolloutComplete('ds/go-http-api')
      }
    }).then(() => {
      if (!argv['skip-deploy']) {
        logger.info(`Rolling release of DaemonSet complete for new version ${packageJson.version}, now waiting for service endpoint to be available`)
        return kubernetes.waitForServiceEndpoint('go-http-api')
      }
    }).then((result) => {
      if (!argv['skip-deploy']) {
        logger.info(`HTTP API accessible at http://${result}:3000. ` +
                    `It may take a few minutes before it's available if this is the first deploy`)
      }
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
