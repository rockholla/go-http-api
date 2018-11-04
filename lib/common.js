const config    = require('@rockholla/clia').config
const logger    = require('@rockholla/clia').logger
const shell     = require('shelljs')
const inquirer  = require('inquirer')

/**
 * Class including common utilities
 */
class Common {

  /**
   * Wrapper for execution of a command line statement
   * @param {string} cmd - the command to execute
   * @param {Object} options - same as options passed to the shelljs.exec function
   * @param {boolean} autoFail - if true and the command returns a non-zero exit status, will fail, otherwise will continue
   * @returns {Object} shelljs.exec result (with stdout, stderr, and code properties)
   */
  exec (cmd, options, autoFail = true) {
    logger.debug(`Executing: ${cmd}`)
    const result = shell.exec(cmd, options)
    if (result.code !== 0 && autoFail) {
      throw result.stderr
    }
    return result
  }

  /**
   * Helper method for parsing and retrieving yargs multi-option command, e.g. <apply|destroy|status>
   * @param {Object} argv - yargs argv object
   * @param {array} validCommands - array of valid commands
   * @returns {string} the command option passed via yargs
   * @throws message noting invalid command passed
   */
  getArgvCommand (argv, validCommands) {
    if (validCommands.indexOf(argv[validCommands[0]]) === -1) {
      throw `Invalid command: ${argv[validCommands[0]]}, please use one of: ${validCommands.join(', ')}`
    }
    return argv[validCommands[0]]
  }

  /**
   * Generic protection via prompts for actions, e.g. apply, destroy, etc.
   * @param {string} area - the name of the area of resources being protected, e.g. bootstrapped resources, kubernetes, jenkins, etc.
   * @param {string} action - the proposed action to take on the resources, e.g. apply, destroy, etc.
   * @param {Object} argv - the yargs argv object for this action run
   * @returns {Promise} will reject if protection checks don't pass, otherwise resolved with an empty result
   */
  protectAction (area, action, argv) {
    switch (action) {
      case 'apply':
        if (argv.force === true) {
          return Promise.resolve()
        } else {
          return inquirer.prompt({
            name: 'continue',
            type: 'confirm',
            message: `You are about to run an apply within "${area}" which may update resources within based on the configuration set. ` +
                     `All operations are idempotent where applicable, but you should double check config values to make sure this is what you want to do. ` +
                     `Are you sure you want to continue?`,
          }).then((response) => {
            if (response.continue) {
              return
            } else {
              return Promise.reject(`Response didn't match, not running anything`)
            }
          })
        }
      case 'destroy':
        if (!config.active.destroy.enabled) {
          return Promise.reject(`Destroying is disabled in the ${argv.activeConfigName} configuration`)
        }
        if (argv.force === true) {
          return Promise.resolve()
        } else {
          logger.warn(`DANGER DANGER DANGER! You are about to destroy all ${area} resources`)
          return inquirer.prompt({
            name: 'confirm',
            type: 'input',
            message: `You are about to destroy all resources in ${area}, Type "destroy ${area}" to confirm that this is what you want to do.`
          }).then((response) => {
            if (response.confirm === `destroy ${area}`) {
              return
            } else {
              return Promise.reject(`Response didn't match, not destroying anything`)
            }
          })
        }
      default:
        return Promise.resolve()
    }
  }

  /**
   * Generic final error handler, logging simply in the default case, more info in the case where debugging is enabled
   * @param {Object|string} error - the error object or message
   * @param {Object} argv - yargs argv object
   */
  processError (error, argv) {
    if (argv.debug) {
      logger.debug(error)
      if (error.stack) {
        logger.debug(`\n${error.stack}`)
      }
    } else {
      logger.error(error)
    }
    process.exit(1)
  }

  /**
   * sleep/pause for an amount of time
   * @param {number} seconds - number of milliseconds to sleep
   */
  sleep (seconds) {
    const start = new Date().getTime()
    for (let i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > seconds * 1000) {
        break
      }
    }
  }

}

module.exports = new Common()
