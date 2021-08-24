'use strict'

const got = require('got')

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

module.exports = {
  proposals,
  proposal
}
