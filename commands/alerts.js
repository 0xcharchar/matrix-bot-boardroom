'use strict'

const { RichReply } = require('matrix-bot-sdk')
const messaging = require('../matrix/messaging')
const { newProposals } = require('../matrix/events')

const alertTypes = {
  'new-proposals': {
    start: async (context) => {
      const { storage } = context

      const protocol = await storage.readValue('protocol')
      if (!protocol) throw new Error('Missing protocol in event starter')

      await newProposals.start(protocol, context)
    },

    stop: (context) => { newProposals.stop(context) }
  }
}

async function handler (params, context) {
  const [state, alert] = params
  if ((state.toLowerCase() !== 'enable' && state.toLowerCase() !== 'disable') || !alert)
    return messaging.errors({ name: 'Error', message: 'Usage: !alert enable|disable alert-type' }, context)

  const matchingAlert = alertTypes[alert.toLowerCase()]
  if (!matchingAlert)
    return messaging.errors({ name: 'Error', message: `Valid alert-types: ${Object.keys(alertTypes).join(', ')}` }, context)

  if (state.toLowerCase() === 'enable') {
    await matchingAlert.start(context)
  } else {
    await matchingAlert.stop(context)
  }

  const message = `${alert.toLowerCase()} has been ${state.toLowerCase()}d`
  const reply = RichReply.createFor(context.roomId, context.event, message, message)
  reply.msgtype = 'm.notice'

  return reply
}

module.exports = {
  command: '!alerts',
  handler
}
