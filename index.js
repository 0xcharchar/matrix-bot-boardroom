'use strict'

require('dotenv').config()
const logger = require('pino')()
const BotStorage = require('./matrix/storage')

require('./matrix')(logger)

// SIGUSR2 is for dev only (nodemon signal)
;['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(signal => {
  process.once(signal, () => {
    const { keys: { PROPOSAL_CHECK_ID } } = BotStorage
    const storage = BotStorage()

    // `storeValue` is Promise<any> or void, I mean wtf
    Promise.resolve(storage.storeValue(PROPOSAL_CHECK_ID, 0))
      .then(() => {
        logger.info({ signal }, 'Shutting down')
        process.kill(process.pid, signal)
      })
  })
})
