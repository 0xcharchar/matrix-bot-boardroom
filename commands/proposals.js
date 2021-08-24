'use strict'

const { RichReply } = require('matrix-bot-sdk')
const ethers = require('ethers')
const { proposals } = require('../boardroom')

// !proposals [protocol]
async function handler (params, { roomId, event, storage }) {
  let cname = params[0] || await storage.readValue('protocol')

  if (!cname) {
    const message = 'No protocol set. Either use `!config protocol your-protocol` or `!proposals your-protocol`'
    const reply = RichReply.createFor(roomId, event, message, message)
    reply.msgtype = 'm.notice'
    return reply
  }

  // setup eth rpc provider
  // TODO don't pin to single provider
  const provider = new ethers.providers.AlchemyProvider('homestead', process.env.PROVIDER_TOKEN_ALCHEMY)

  // call proposals endpoint
  const proposalList = await proposals(cname)

  // extract refId, title, proposer, state
  const messages = (await Promise.all(proposalList.map(async p => {
    const votes = p.results.map(v => ({ count: v.total, choice: p.choices[v.choice] }))

    return {
      refId: p.refId,
      title: p.title,
      proposer: await provider.lookupAddress(p.proposer) || p.proposer,
      proposalUrl: `https://app.boardroom.info/${p.protocol}/proposal/${p.refId}`,
      votes
    }
  }))).map(p => {
    let text = `${p.title} by ${p.proposer} at (${p.proposalUrl})`
    let html = `<b><a href="${p.proposalUrl}">${p.title} (${p.refId})</a></b> by <em>${p.proposer}</em>`

    return { text, html }
  }).reduce((condensed, current) => {
    condensed.text = `${condensed.text}\n${current.text}`
    condensed.html = `${condensed.html}<li>${current.html}</li>`

    return condensed
  }, { text: '', html: '<p>Proposals:</p><ul>' })

  messages.html = `${messages.html}</ul>`

  const reply = RichReply.createFor(roomId, event, messages.text, messages.html)
  reply.msgtype = 'm.notice'

  return reply
}

module.exports = {
  command: '!proposals',
  handler
}
