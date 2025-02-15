const { PhoenixClient } = require("./tools/PhoenixClient");
const fs = require("fs");
const { fork } = require("child_process");
const clients = [];

switch (require("./config.json").process.botmode) {
  case "prod": {
    clients.push(new PhoenixClient());
    const client = clients[0];
    client.login(process.env.TOKEN);
    break;
  }
  case "dev": {
    clients.push(new PhoenixClient());
    const client = clients[0];
    client.login(process.env.STAGINGTOKEN);
    break;
  }
  case "test": {
    clients.push(new PhoenixClient());
    const client = clients[0];
    client.login(process.env.TESTTOKEN);
    break;
  }
  case "custom": {
    const bots = JSON.parse(
      fs.readFileSync(__dirname + "/custombots.json", "utf8"),
    );
    console.log(bots);

    console.log(`Phoenix custom bots enabled. Beginning custom bots.`);
    console.log(
      `Starting the following bots:\n${bots.map((b) => b.client)}\nThis operation will take ${Math.floor((bots.length * 1500) / 1000)} seconds to complete.`,
    );
    for (let i = 0; i < bots.length; i++) {
      const index = i;
      setTimeout(function () {
        console.log(`Starting bot ${bots[index].client}`);
        fork(`custombot.js`).send(bots[index].token);
      }, 1500 * i);
    }
  }
}

exports.client = clients[0];
exports.clients = clients;
