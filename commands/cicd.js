const fs        = require('fs')
const path      = require('path')
const common    = require('lib/common')
const logger    = require('@rockholla/clia').logger
const childp    = require('child_process')
const inquirer  = require('inquirer')

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
    const root        = path.resolve(__dirname, '..')
    let packageJson   = require(path.resolve(root, 'package.json'))
    let currentBranch = common.exec('git rev-parse --abbrev-ref HEAD', { cwd: root }).trim()
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
        choices: ['Major', 'Minor', 'Patch', 'Current package.json version'],
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
        case 'Current package.json version':
          // version stays the same
          break
        default:
          throw new Error(`Invalid release type ${response.releaseType}`)
      }
      packageJson.version = version.join('.')
      fs.writeFileSync(path.resolve(root, 'package.json'), JSON.stringify(packageJson, null, 2))
      common.exec('git add .', { cwd: root })
      common.exec(`git commit --no-verify -m "updating package.json to ${packageJson.version}"`)
      common.exec('git checkout master', { cwd: root })
      common.exec(`git merge ${currentBranch}`, { cwd: root })
      common.exec(`git checkout ${currentBranch}`, { cwd: root })
      common.exec(`git tag -a ${packageJson.version} -m "Tagging version ${packageJson.version}"`, { cwd: root })
      try {
        throw 'blah'
        //common.exec('git push --all origin', { cwd: root })
        //common.exec('git push --tags origin', { cwd: root })
      } catch (error) {
        logger.warn('Unable to push branches/tags to the origin repository. This likely means you have no access.')
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
