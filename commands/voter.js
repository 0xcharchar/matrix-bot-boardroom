'use strict'

const { RichReply } = require('matrix-bot-sdk')
const { voter } = require('../boardroom')
const messaging = require('../matrix/messaging')

async function handler (params, { roomId, event }) {
  const [addressOrEns] = params

  if (!addressOrEns) {
    return messaging.errors({ name: 'Error', message: 'Missing an address or ENS name' }, { roomId, event })
  }

  const voterData = await voter(addressOrEns)
  voterData.address = addressOrEns

  let text = `${voterData.address} has cast ${voterData.totalVotesCast} votes`
  let html = `<b>${voterData.address}</b> has cast <b>${voterData.totalVotesCast}</b> votes`

  if (voterData.protocols.length > 0) {
    const textProtocols = voterData.protocols.map(p => `* ${p.totalVotesCast} on ${p.protocol}`).join('\n')
    text = `${text} with:\n${textProtocols}`

    const htmlProtocols = voterData.protocols.map(p => `<li><b>${p.totalVotesCast}</b> on <b>${p.protocol}</b></li>`).join('')
    html = `${html} with:<ul>${htmlProtocols}</ul>`
  }

  const reply = RichReply.createFor(roomId, event, text, html)
  reply.msgtype = 'm.notice'
  return reply
}

module.exports = {
  command: '!voter',
  handler
}
