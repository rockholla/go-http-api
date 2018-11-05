const shell = require('shelljs')

module.exports = () => {
  const path  = require('path')
  const fs    = require('fs')
  console.log(`Killing docker process ${process.env.GO_HTTP_API_DOCKER_PROCESS}`)
  shell.exec(`docker kill ${process.env.GO_HTTP_API_DOCKER_PROCESS}`, { silent: true })
  shell.exec(`docker rm ${process.env.GO_HTTP_API_DOCKER_PROCESS}`, { silent: true })
  if (fs.existsSync(path.resolve(__dirname, '..', 'config', 'local.js'))) {
    fs.unlinkSync(path.resolve(__dirname, '..', 'config', 'local.js'))
  }
  if (fs.existsSync(path.resolve(__dirname, '..', 'config', 'local.tmp.js'))) {
    fs.renameSync(path.resolve(__dirname, '..', 'config', 'local.tmp.js'), path.resolve(__dirname, '..', 'config', 'local.js'))
  }
}
