'use strict'

const { RichReply } = require('matrix-bot-sdk')

function errors (err, { roomId, event }) {
  const text = `
🚨 ${err.name} 🚨
===

${err.message}`
  const html = `<p>🚨 <b>${err.name}</b> 🚨: ${err.message}</p>`

  const reply = RichReply.createFor(roomId, event, text, html)
  reply.msgtype = 'm.notice'
  return reply
}

module.exports = {
  errors
}
