module.exports = () => {
  const path  = require('path')
  const fs    = require('fs')
  if (fs.existsSync(path.resolve(__dirname, '..', 'config', 'local.js'))) {
    fs.unlinkSync(path.resolve(__dirname, '..', 'config', 'local.js'))
  }
  if (fs.existsSync(path.resolve(__dirname, '..', 'config', 'local.tmp.js'))) {
    fs.renameSync(path.resolve(__dirname, '..', 'config', 'local.tmp.js'), path.resolve(__dirname, '..', 'config', 'local.js'))
  }
}
