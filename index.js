import { Extension, HDirection, HEntity, HEntityType, HPacket, HRoomResult } from 'gnode-api'
import { readFileSync } from 'fs'
const extensionInfo = JSON.parse(readFileSync('./package.json'))

process.on('uncaughtException', (error) => {
  console.error(error)
  process.exit(0)
})

const ext = new Extension(extensionInfo)
ext.run()

let extensionEnabled = false
const entities = {
  PLANTS: new Map()
}
const command = {
  TREAT: '!plants',
  COMPOST: '!plants compost'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const hPacketMessage = (message) => {
  const hPacket = new HPacket('Whisper', HDirection.TOCLIENT)
  hPacket.appendInt(1)
  hPacket.appendString(message)
  hPacket.appendInt(0)
  hPacket.appendInt(34)
  hPacket.appendInt(0)
  hPacket.appendInt(-1)

  ext.sendToClient(hPacket)
}

const onUsers = async (hMessage) => {
  await sleep(1000)
  const packet = hMessage.getPacket()
  const entity = HEntity.parse(packet)

  entity.forEach((a) => {
    if (a.entityType === HEntityType.PET) {
      entities.PLANTS.set(a.id, a.stuff.at(-1))
    }
  })
}

const onCommandSended = (hMessage) => {
  const packet = hMessage.getPacket()
  const textMessage = packet.readString()
  const hPacket = () => hPacketMessage(`Plants has been ${extensionEnabled ? 'activated' : 'deactivated'}`)

  if (textMessage === command.TREAT) {
    hMessage.blocked = true
    extensionEnabled = !extensionEnabled

    if (extensionEnabled) treatPlants()
    hPacket()
  }

  if (textMessage === command.COMPOST) {
    hMessage.blocked = true
    extensionEnabled = !extensionEnabled

    if (extensionEnabled) compostPlants()
    hPacket()
  }
}

const treatPlants = async () => {
  let n = 0
  for (const plantId of entities.PLANTS.keys()) {
    const plantStuff = entities.PLANTS.get(plantId)
    if (extensionEnabled) {
      if (plantStuff !== 'rip') {
        const hPacket = new HPacket('RespectPet', HDirection.TOSERVER)
        hPacket.appendInt(plantId)
        ext.sendToServer(hPacket)
        n++
        await sleep(600)
      }
    }
  }

  hPacketMessage(`All plants have been treated (${n})`)
  extensionEnabled = false
}

const compostPlants = async () => {
  let n = 0
  for (const plantId of entities.PLANTS.keys()) {
    const plantStuff = entities.PLANTS.get(plantId)
    if (extensionEnabled) {
      if (plantStuff === 'rip') {
        const hPacket = new HPacket('CompostPlant', HDirection.TOSERVER)
        hPacket.appendInt(plantId)
        ext.sendToServer(hPacket)
        n++
        await sleep(600)
      }
    }
  }

  hPacketMessage(`All plants have been compost (${n})`)
  extensionEnabled = false
}

const exit = () => {
  entities.PLANTS.clear()
  extensionEnabled = false
}

const onCommandReset = (hMessage) => {
  const packet = hMessage.getPacket()
  const hRoom = new HRoomResult(packet)
  if (hRoom.isEnterRoom) exit()
}

ext.interceptByNameOrHash(HDirection.TOCLIENT, 'Users', onUsers)
ext.interceptByNameOrHash(HDirection.TOSERVER, 'Chat', onCommandSended)
ext.interceptByNameOrHash(HDirection.TOCLIENT, 'GetGuestRoomResult', onCommandReset)
ext.interceptByNameOrHash(HDirection.TOSERVER, 'Quit', exit)
