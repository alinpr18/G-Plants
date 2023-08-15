import {
  Extension,
  HDirection,
  HEntity,
  HEntityType,
  HPacket,
} from "gnode-api";
import extensionInfo from "./package.json" assert { type: "json" };

process.on("uncaughtException", (error) => {
  console.error(error);
  process.exit(0);
});

const ext = new Extension(extensionInfo);
extensionInfo.name = "Plants"

ext.run();

ext.interceptByNameOrHash(HDirection.TOCLIENT, "Users", onTest);
ext.interceptByNameOrHash(HDirection.TOSERVER, "Chat", onCommandSended);
ext.interceptByNameOrHash(HDirection.TOSERVER, "GetGuestRoom", onResetCommand);

const entities = new Map();
let extensionEnabled = false;

function onTest(hMessage) {
  const plants = HEntity.parse(hMessage.getPacket());
  plants.forEach((plant) => {
    if (plant.entityType === HEntityType.PET)
      entities.set(plant.id, plant.name);
  });
}

function onCommandSended(hMessage) {
  const packet = hMessage.getPacket();
  const textMessage = packet.readString();

  if (textMessage === ":plants") {
    hMessage.blocked = true;
    extensionEnabled = !extensionEnabled;

    if (extensionEnabled) start();

    const chatPacket = new HPacket(
      `{in:Whisper}{i:1}{s:"Plants has been ${
        extensionEnabled ? "activated" : "deactivated"
      }"}{i:0}{i:34}{i:0}{i:-1}`
    );
    ext.sendToClient(chatPacket);
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function start() {
  for (let plantID of entities.keys()) {
    if (extensionEnabled) {
      const packet = new HPacket(`{out:RespectPet}{i:${plantID}}`);
      ext.sendToServer(packet);
      await sleep(500);
    }
  }
  const chatPacket = new HPacket(
    `{in:Whisper}{i:1}{s:"All plants have been treated"}{i:0}{i:34}{i:0}{i:-1}`
  );
  ext.sendToClient(chatPacket);
}

let roomID;
let newRoomID;

function onResetCommand(hMessage) {
  const packet = hMessage.getPacket();
  roomID = packet.readInteger();

  if (roomID !== newRoomID) {
    newRoomID = roomID;
    entities.clear();
    extensionEnabled = false;
  }
}
