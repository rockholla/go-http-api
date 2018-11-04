const common    = require('lib/common')

describe('lib/common', () => {

  it('shell.exec wrapper works', () => {
    const result = common.exec(`node --version`, { silent: true })
    expect(result.stdout).toMatch(/^v\d/g)
  })

})
