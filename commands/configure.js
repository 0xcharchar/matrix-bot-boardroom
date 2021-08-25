'use strict'

const { RichReply } = require('matrix-bot-sdk')
const messaging = require('../matrix/messaging')

// !config <key> [value]
async function handler (params, { roomId, event, storage }) {
  // TODO error reply, do not throw
  if (params.length < 1 || params.length > 2)
    return messaging.errors({ name: 'Error', message: 'Incorrect number of parameters' }, { roomId, event })

  const [key, value] = params

  let message = 'Protocol saved'
  if (key !== 'protocol') {
    message = 'Unknown key'
  }

  let saveValue = value
  if (!value) saveValue = ''

  await storage.storeValue(key, saveValue)

  const reply = RichReply.createFor(roomId, event, message, message)
  reply.msgtype = 'm.notice'

  return reply
}

module.exports = {
  command: '!config',
  handler
}
