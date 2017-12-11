const createServer = require('../..')
const Client = require('..')
const request = require('supertest')
const nock = require('nock')

// Only allow requests to the proxy server listening on localhost
nock.enableNetConnect('127.0.0.1')

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('client', () => {
  let proxy, host, client, channel

  const targetUrl = 'http://example.com/foo/bar'

  beforeEach((done) => {
    proxy = createServer().listen(0, () => {
      host = `http://127.0.0.1:${proxy.address().port}`
      done()
    })
  })

  afterEach(() => {
    proxy && proxy.close()
    client && client.close()
  })

  describe('connecting to a channel', () => {
    beforeEach((done) => {
      channel = '/fake-channel'
      client = new Client({
        source: `${host}${channel}`,
        target: targetUrl,
        logger
      }).start()
      // Wait for event source to be ready
      client.addEventListener('ready', () => done())
    })

    test('POST /:channel forwards to target url', async (done) => {
      const payload = {payload: true}

      // Expect request to target
      const forward = nock('http://example.com').post('/foo/bar', payload).reply(200)

      // Test is done when this is called
      client.addEventListener('message', (msg) => {
        expect(forward.isDone()).toBe(true)
        done()
      })

      // Send request to proxy server
      await request(proxy).post(channel).send(payload).expect(200)
    })
  })

  describe('/new', () => {
    beforeEach(() => {
      client = new Client({
        source: `${host}/new`,
        target: targetUrl,
        logger
      }).start()
    })

    test('connects to a new channel', async (done) => {
      // Wait for event source to be ready
      client.addEventListener('ready', () => {
        expect(client.url).not.toMatch(/\/new$/)
        expect(client.url).toMatch(/\/(\w+)/)
        done()
      })
    })
  })
})
