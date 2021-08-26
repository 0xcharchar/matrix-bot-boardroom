'use strict'

const got = require('got')
const ethers = require('ethers')

const ROOT_URL = 'https://api.boardroom.info/v1'

async function proposals (cname) {
  let url = ROOT_URL

  if (cname) url = `${url}/protocols/${cname}/proposals`
  else url = `${url}/proposals`

  const { data } = await got(url).json()
  return data
}

async function proposal (refId) {
  if (!refId) throw new Error('missing refId')

  const { data } = await got(`${ROOT_URL}/proposals/${refId}`).json()
  return data
}

async function voter (addressOrEns) {
  let addr = addressOrEns
  if (!ethers.utils.isAddress(addressOrEns)) {
    const provider = new ethers.providers.AlchemyProvider('homestead', process.env.PROVIDER_TOKEN_ALCHEMY)
    addr = await provider.resolveName(addressOrEns)
  }

  const { data } = await got(`${ROOT_URL}/voters/${addr}`).json()
  return data
}

module.exports = {
  proposal,
  proposals,
  voter
}
