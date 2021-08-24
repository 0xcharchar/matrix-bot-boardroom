'use strict'

const {
  AutojoinRoomsMixin,
  MatrixClient,
  SimpleFsStorageProvider
} = require('matrix-bot-sdk')
const fs = require('fs/promises')
const path = require('path')

// Mostly ripped from MatrixAuth, this version allows passing in a storage option
async function passwordLogin(host, username, password, storage = null, deviceName = null) {
  const body = {
    type: "m.login.password",
    identifier: {
      type: "m.id.user",
      user: username,
    },
    password: password,
    initial_device_display_name: deviceName,
  };

  const tempClient = new MatrixClient(host, '')
  const response = await tempClient.doRequest("POST", "/_matrix/client/r0/login", null, body);
  const accessToken = response["access_token"];
  if (!accessToken) throw new Error("Expected access token in response - got nothing");

  let homeserverUrl = host;
  if (response['well_known'] && response['well_known']['m.homeserver'] && response['well_known']['m.homeserver']['base_url']) {
    homeserverUrl = response['well_known']['m.homeserver']['base_url'];
  }

  return new MatrixClient(homeserverUrl, accessToken, storage);
}

function handleCommand (client, commands) {
  console.log('the commands', commands)
  return async (roomId, event) => {
    console.log('entered handler', roomId, event)
    if (!event.content) return

    if (event.content.msgtype !== 'm.text') return

    if (event.sender === await client.getUserId()) return

    const { body } = event.content
    if (!body) return

    const messageParts = body.split(' ')
    const command = messageParts.shift()

    if (!commands[command]) return

    const reply = await commands[command](messageParts, { roomId, event, storage: client.storageProvider })

    client.sendMessage(roomId, reply)
  }
}

async function loadCommands (commandsDir = 'commands') {
  const files = await fs.readdir(commandsDir)
  const modules = files.filter(m => m.endsWith('.js'))

  let commands = {}
  for (let idx = 0; idx < modules.length; idx += 1) {
    const { command, handler } = require(path.resolve(path.join(commandsDir, modules[idx])))
    commands[command] = handler
  }

  return commands
}

async function connect (shouldRegister = false) {
  const { MATRIX_HOMESERVER_URL, MATRIX_BOT_USERNAME, MATRIX_BOT_PASSWORD } = process.env

  const commands = await loadCommands()

  let client

  try {
    const storage = new SimpleFsStorageProvider('boardroom-bot.json')
    client = await passwordLogin(MATRIX_HOMESERVER_URL, MATRIX_BOT_USERNAME, MATRIX_BOT_PASSWORD, storage)
    console.log('client connected', await client.getUserId())
  } catch (err) {
    console.log('dun goofed', err)
  }
  AutojoinRoomsMixin.setupOnClient(client)

  client.on('room.message', handleCommand(client, commands))

  client.start().then(() => console.log(`Connected to ${MATRIX_HOMESERVER_URL}`))
}

module.exports = connect
