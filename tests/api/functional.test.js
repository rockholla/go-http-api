const common  = require('lib/common')
const path    = require('path')
const request = require('request')
const timeout = 10000

describe('api/functional', () => {

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
