const path    = require('path')
const logger  = require('@rockholla/clia').logger
const shell   = require('shelljs')

module.exports = () => {
  const shell = require('shelljs')
  const path  = require('path')
  const fs    = require('fs')
  if (fs.existsSync(path.resolve(__dirname, '..', 'config', 'local.js'))) {
    fs.renameSync(path.resolve(__dirname, '..', 'config', 'local.js'), path.resolve(__dirname, '..', 'config', 'local.tmp.js'))
  }
  shell.exec(`./clia use tests`, { cwd: path.resolve(__dirname, '..') })
  process.env.GO_HTTP_API_DOCKER_PROCESS = shell.exec('docker run -d -p 3000:3000 rockholla/go-http-api', { silent: true })
  console.log(`Starting docker process for local server: ${process.env.GO_HTTP_API_DOCKER_PROCESS}`)
}
