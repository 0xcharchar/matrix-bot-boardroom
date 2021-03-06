'use strict'

const {
  AutojoinRoomsMixin,
  MatrixClient,
  SimpleFsStorageProvider
} = require('matrix-bot-sdk')
const fs = require('fs/promises')
const path = require('path')
const BotStorage = require('./storage')

let logger

// Mostly ripped from MatrixAuth, this version allows passing in a storage option
async function passwordLogin (host, username, password, storage = null, deviceName = null) {
  const body = {
    type: 'm.login.password',
    identifier: {
      type: 'm.id.user',
      user: username
    },
    password: password,
    initial_device_display_name: deviceName
  }

  const tempClient = new MatrixClient(host, '')
  const response = await tempClient.doRequest('POST', '/_matrix/client/r0/login', null, body)
  const accessToken = response.access_token
  if (!accessToken) throw new Error('Expected access token in response - got nothing')

  let homeserverUrl = host
  if (response.well_known && response.well_known['m.homeserver'] && response.well_known['m.homeserver'].base_url) {
    homeserverUrl = response.well_known['m.homeserver'].base_url
  }

  return new MatrixClient(homeserverUrl, accessToken, storage)
}

async function register (host, username, password, storage = null, deviceName = null) {
  // First try and complete the stage without UIA in hopes the server is kind to us:
  const body = {
    username,
    password,
    initial_device_display_name: deviceName
  }

  const tempClient = new MatrixClient(host, '')
  let response

  try {
    response = await tempClient.doRequest('POST', '/_matrix/client/r0/register', null, body)
  } catch (e) {
    if (e.statusCode !== 401) throw e

    if (typeof (e.body) === 'string') e.body = JSON.parse(e.body)
    if (!e.body) throw new Error(JSON.stringify(Object.keys(e)))

    // 401 means we need to do UIA, so try and complete a stage
    const sessionId = e.body.session
    const expectedFlow = ['m.login.dummy']

    let hasFlow = false
    for (const flow of e.body.flows) {
      const stages = flow.stages
      if (stages.length !== expectedFlow.length) continue

      let stagesMatch = true
      for (let i = 0; i < stages.length; i++) {
        if (stages[i] !== expectedFlow[i]) {
          stagesMatch = false
          break
        }
      }

      if (stagesMatch) {
        hasFlow = true
        break
      }
    }

    if (!hasFlow) throw new Error('Failed to find appropriate login flow in User-Interactive Authentication')

    body.auth = {
      type: expectedFlow[0], // HACK: We assume we only have one entry here
      session: sessionId
    }
    response = await tempClient.doRequest('POST', '/_matrix/client/r0/register', null, body)
  }

  if (!response) throw new Error('Failed to register')

  const accessToken = response.access_token
  if (!accessToken) throw new Error('No access token returned')

  return new MatrixClient(host, accessToken, storage)
}

function handleCommand (client, commands) {
  logger.debug({ commands }, 'Loaded commands')
  return async (roomId, event) => {
    logger.debug({ roomId, event }, 'Entered handler')
    if (!event.content) return

    if (event.content.msgtype !== 'm.text') return

    if (event.sender === await client.getUserId()) return

    const { body } = event.content
    if (!body) return

    const messageParts = body.split(' ')
    const command = messageParts.shift()

    if (!commands[command]) return

    const context = {
      roomId,
      event,
      logger,
      storage: client.storageProvider,
      _client: client
    }
    const reply = await commands[command](messageParts, context)

    client.sendMessage(roomId, reply)
  }
}

async function loadCommands (commandsDir = 'commands') {
  const files = await fs.readdir(commandsDir)
  const modules = files.filter(m => m.endsWith('.js'))

  const commands = {}
  for (let idx = 0; idx < modules.length; idx += 1) {
    const { command, handler } = require(path.resolve(path.join(commandsDir, modules[idx])))
    commands[command] = handler
  }

  return commands
}

async function connect (_logger) {
  const { MATRIX_HOMESERVER_URL, MATRIX_BOT_USERNAME, MATRIX_BOT_PASSWORD } = process.env

  logger = _logger

  const commands = await loadCommands()

  const storage = new SimpleFsStorageProvider('boardroom-bot.json')
  const isRegistered = !!(await storage.readValue('isRegistered'))

  let client
  try {
    if (isRegistered) {
      client = await passwordLogin(MATRIX_HOMESERVER_URL, MATRIX_BOT_USERNAME, MATRIX_BOT_PASSWORD, storage)
    } else {
      client = await register(MATRIX_HOMESERVER_URL, MATRIX_BOT_USERNAME, MATRIX_BOT_PASSWORD, storage)
      await storage.storeValue('isRegistered', true)
    }
  } catch (err) {
    client = await passwordLogin(MATRIX_HOMESERVER_URL, MATRIX_BOT_USERNAME, MATRIX_BOT_PASSWORD, storage)
  }
  AutojoinRoomsMixin.setupOnClient(client)

  BotStorage(client.storageProvider)

  client.on('room.message', handleCommand(client, commands))

  await client.start()
  const userId = await client.getUserId()
  logger.info({ host: MATRIX_HOMESERVER_URL, userId }, 'Connected')
}

module.exports = connect
