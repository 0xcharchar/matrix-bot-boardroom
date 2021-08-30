'use strict'

const { RichReply } = require('matrix-bot-sdk')
const ethers = require('ethers')
const { proposals } = require('../boardroom')
const messaging = require('./messaging')

const ONE_MINUTE = 60000 // milliseconds

async function startProposalEvent (protocol, { roomId, _client }) {
  if (!protocol) return messaging.errors({ name: 'Error', message: 'Missing protocol, cannot check for proposals' }, { roomId, event })

  const provider = new ethers.providers.AlchemyProvider('homestead', process.env.PROVIDER_TOKEN_ALCHEMY)
  const storage = _client.storageProvider

  const alreadyRunning = !!(await storage.readValue('proposalCheckId'))
  if (alreadyRunning) {
    console.warn('new-proposal events already enabled')
    return
  }

  const intervalId = setInterval(async () => {
    const lastProposalId = await storage.readValue('lastProposalId')
    const data = await proposals(protocol)

    console.log('we heeere')

    let idx = 0
    for (idx = 0; idx < data.length; idx += 1) {
      console.log('we heeere ', idx)
      const proposal = data[idx]
      if (proposal.refId === lastProposalId) break

      // TODO no awaits in a loop, bad charchar
      // const proposer = await provider.lookupAddress(proposal.proposer) || proposal.proposer
      const proposer = proposal.proposer

      _client.sendMessage(roomId, {
        msgtype: 'm.text',
        body: `${proposal.title} by ${proposer}, see: ${proposal.proposalUrl}`,
        format: 'org.matrix.custom.html',
        formatted_body: `<b><a href="${proposal.proposalUrl}">${proposal.title} (${proposal.refId})</a></b> by <em>${proposer}</em>`
      })
    }

    if (idx > 0) await storage.storeValue('lastProposalId', data[0].refId)
    else console.log('No new proposals')

    console.log('we heeere at the end')
  }, ONE_MINUTE * 5)

  await storage.storeValue('proposalCheckId', intervalId[Symbol.toPrimitive]())
}

// TODO call this on shutdown
async function stopProposalEvent ({ storage }) {
  const proposalCheckId = await storage.readValue('proposalCheckId')
  if (proposalCheckId) clearInterval(proposalCheckId)
}

module.exports = {
  newProposals: { start: startProposalEvent, stop: stopProposalEvent }
}
