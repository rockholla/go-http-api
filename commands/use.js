'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _clia = require('@rockholla/clia');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class CommandDefinition {

  constructor() {
    this.command = 'use [name]';
    this.desc = 'switch to a different configuration in /config';
  }

  symlink(argv) {
    if (_fs2.default.existsSync(_path2.default.join(__dirname, '..', 'config', 'local.js'))) {
      _fs2.default.unlinkSync(_path2.default.join(__dirname, '..', 'config', 'local.js'));
    }
    _fs2.default.symlinkSync(_path2.default.join(__dirname, '..', 'config', argv.name + '.js'), _path2.default.join(__dirname, '..', 'config', 'local.js'));
    _clia.logger.info(`Now using ${argv.name} configuration`);
  }

  handler(argv) {
    if (!argv.name) {
      _clia.logger.error('Please enter a name for the new configuration');
      process.exit(1);
    }
    if (argv.name === 'default') {
      this.deleteExisting();
      _clia.logger.info('Now using the default config');
      return;
    }

    if (_fs2.default.existsSync(_path2.default.join(__dirname, '..', 'config', argv.name + '.js'))) {
      this.deleteExisting();
      this.symlink(argv);
    } else {
      _clia.logger.warn(`Unable to find /config/${argv.name}`);
      _inquirer2.default.prompt({
        type: 'confirm',
        name: 'create',
        message: 'Would you like to create it?'
      }).then(response => {
        if (response.create) {
          _fs2.default.writeFileSync(_path2.default.resolve(__dirname, '..', 'config', `${argv.name}.js`), 'module.exports = {}');
          this.symlink(argv);
        }
      });
    }
  }

  deleteExisting() {
    try {
      _fs2.default.unlinkSync(_path2.default.join(__dirname, '..', 'config', 'local.js'));
    } catch (error) {
      // bypass silently
    }
  }
}

const commandDefinition = new CommandDefinition();
module.exports = {
  command: commandDefinition.command,
  desc: commandDefinition.desc,
  handler: argv => {
    commandDefinition.handler(argv);
  }
};