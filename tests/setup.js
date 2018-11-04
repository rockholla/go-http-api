const path    = require('path')
const logger  = require('@rockholla/clia').logger

module.exports = () => {
  const shell = require('shelljs')
  const path  = require('path')
  const fs    = require('fs')
  if (fs.existsSync(path.resolve(__dirname, '..', 'config', 'local.js'))) {
    fs.renameSync(path.resolve(__dirname, '..', 'config', 'local.js'), path.resolve(__dirname, '..', 'config', 'local.tmp.js'))
  }
  shell.exec(`./clia use tests`, { cwd: path.resolve(__dirname, '..') })
  if (!fs.existsSync(path.resolve(__dirname, '..', 'build', 'main'))) {
    logger.error('build/main does not exist, please run "npm run build"')
    process.exit(1)
  }
}
