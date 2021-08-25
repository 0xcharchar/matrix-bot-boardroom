'use strict'

const { RichReply } = require('matrix-bot-sdk')
const ethers = require('ethers')
const { proposal } = require('../boardroom')

// !proposal [refId]
async function handler (params, { roomId, event, storage }) {
  const [refId] = params

  if (!refId) {
    const message = 'Missing the proposal ID. Usage: `!proposal proposalId`'
    const reply = RichReply.createFor(roomId, event, message, message)
    reply.msgtype = 'm.notice'
    return reply
  }

  // setup eth rpc provider
  // TODO don't pin to single provider
  const provider = new ethers.providers.AlchemyProvider('homestead', process.env.PROVIDER_TOKEN_ALCHEMY)

  // call proposal endpoint
  const p = await proposal(refId)

  const text = `
# ${p.title}

* On Boardroom: https://app.boardroom.info/${p.protocol}/proposal/${p.refId}
* External: ${p.externalUrl || 'N/A'}

${p.content}
`

  const html = `
<h1>${p.title}</h1>
<ul>
  <li><a href="https://app.boardroom.info/${p.protocol}/proposal/${p.refId}">On Boardroom</a></li>
  <li><a href="${p.externalUrl}">External URL</a></li>
</ul>
<detail>${p.content}</detail>
`

  const reply = RichReply.createFor(roomId, event, text, html)
  reply.msgtype = 'm.notice'
  return reply
}

module.exports = {
  command: '!proposal',
  handler
}
