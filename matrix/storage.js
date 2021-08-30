'use strict'

// Storage singleton for the bot, providing access outside of normal bot flow
// It isn't optimal and requires carefully setting up with a MatrixClient first

module.exports = BotStorage
module.exports.keys = {
  PROTOCOL: 'protocol',
  IS_REGISTERED: 'isRegistered',
  LAST_PROPOSAL_ID: 'lastProposalId',
  PROPOSAL_CHECK_ID: 'proposalCheckId'
}

let storageProvider

function BotStorage (_storageProvider) {
  if (storageProvider) return storageProvider

  if (!_storageProvider) throw new Error('Calling BotStorage without a client for first setup is bad news')

  storageProvider = _storageProvider
  return storageProvider
}
