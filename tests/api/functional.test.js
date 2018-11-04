const common  = require('lib/common')
const childp  = require('child_process')
const path    = require('path')
const request = require('request')
const timeout = 10000

let serverProcess = null

beforeAll((done) => {
  serverProcess = childp.spawn('./main', [], { detached: true, cwd: path.resolve(__dirname, '..', '..', 'build') })
  serverProcess.stdout.on('data', (data) => {
    if (data.toString('utf8').match(/Running/g)) {
      console.log(`Started test HTTP API server on PID ${serverProcess.pid}`)
      done()
    }
  })
})

afterAll((done) => {
  console.log(`Killing server process at PID ${serverProcess.pid}`)
  serverProcess.kill()
  done()
})

describe('api/functional', () => {

  let serverProcess = null

  it('root should return a welcome message', (done) => {
    request('http://localhost:3000', { json: true }, (error, response, body) => {
      expect(body.message).toMatch(/Welcome/g)
      done()
    })
  }, timeout)

  it('trailheads should return an array of trailheads', (done) => {
    request('http://localhost:3000/trailheads', { json: true }, (error, response, body) => {
      expect(body instanceof Array).toEqual(true)
      expect(body[0].Longitude).toBeLessThan(0)
      done()
    })
  }, timeout)

})
