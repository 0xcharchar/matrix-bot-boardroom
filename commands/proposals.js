'use strict'

const { RichReply } = require('matrix-bot-sdk')
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

  // call proposals endpoint
  const proposalList = await proposals(cname)

  // extract refId, title, proposer, state
  const messages = proposalList.map(p => {
    const votes = p.results.map(v => ({ count: v.total, choice: p.choices[v.choice] }))

    return {
      refId: p.refId,
      title: p.title,
      proposer: p.proposer,
      proposalUrl: `https://app.boardroom.info/${p.protocol}/proposal/${p.refId}`,
      votes
    }
  }).map(p => {
    let text = `${p.title} by ${p.proposer} at (${p.proposalUrl})`
    let html = `<b><a href="${p.proposalUrl}">${p.title}</a></b> by <em>${p.proposer}</em>`

    return { text, html }
  }).reduce((condensed, current) => {
    condensed.text = `${condensed.text}\n${current.text}`
    condensed.html = `${condensed.html}<li>${current.html}</li>`

    return condensed
  }, { text: '', html: '<ul>' })

  messages.html = `${messages.html}</ul>`

  const reply = RichReply.createFor(roomId, event, messages.text, messages.html)
  reply.msgtype = 'm.notice'

  return reply
}

module.exports = {
  command: '!proposals',
  handler
}
