'use strict'

const { RichReply } = require('matrix-bot-sdk')
const ethers = require('ethers')
const { proposals } = require('../boardroom')
const messaging = require('../matrix/messaging')

// !proposals [protocol]
async function handler (params, { roomId, event, storage }) {
  const storedProtocol = await storage.readValue('protocol')
  const cname = params[0] || storedProtocol

  if (!cname) {
    const message = 'No protocol set. Either use `!config protocol your-protocol` or `!proposals your-protocol`'
    return messaging.errors({ name: 'Error', message }, { roomId, event })
  }

  // setup eth rpc provider
  // TODO don't pin to single provider
  const provider = new ethers.providers.AlchemyProvider('homestead', process.env.PROVIDER_TOKEN_ALCHEMY)

  // call proposals endpoint
  const proposalList = await proposals(cname)

  // extract refId, title, proposer, state
  const partialProposals = await Promise.all(proposalList.map(async p => {
    const votes = p.results.map(v => ({ count: v.total, choice: p.choices[v.choice] }))

    return {
      refId: p.refId,
      title: p.title,
      proposer: await provider.lookupAddress(p.proposer) || p.proposer,
      proposalUrl: `https://app.boardroom.info/${p.protocol}/proposal/${p.refId}`,
      votes
    }
  }))

  if (storedProtocol && storedProtocol === cname) {
    await storage.storeValue('lastProposalId', partialProposals[0].refId)
  }

  const messages = partialProposals.map(p => {
    const text = `${p.title} by ${p.proposer}, see: ${p.proposalUrl}`
    const html = `<b><a href="${p.proposalUrl}">${p.title} (${p.refId})</a></b> by <em>${p.proposer}</em>`

    return { text, html }
  }).reduce((condensed, current) => {
    condensed.text = `${condensed.text}\n* ${current.text}`
    condensed.html = `${condensed.html}<li>${current.html}</li>`

    return condensed
  }, { text: 'Proposals:\n', html: '<p>Proposals:</p><ul>' })

  messages.html = `${messages.html}</ul>`

  const reply = RichReply.createFor(roomId, event, messages.text, messages.html)
  reply.msgtype = 'm.notice'

  return reply
}

module.exports = {
  command: '!proposals',
  handler
}
