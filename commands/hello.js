'use strict'

const { RichReply } = require('matrix-bot-sdk')

async function handler (params, { roomId, event }) {
  const body = 'Hello to you too'
  const reply = RichReply.createFor(roomId, event, body, body)
  reply.msgtype = 'm.notice'

  return reply
}

module.exports = {
  command: '!hello',
  handler
}
