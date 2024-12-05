const { PhoenixClient } = require("./tools/PhoenixClient");
const fs = require("fs");
const { fork } = require("child_process");
const { ClusterClient } = require('discord-hybrid-sharding');

require("./tools/database").connect();

switch (require("./config.json").process.botmode) {
  case "prod": {
    const client = new PhoenixClient();
    client.cluster.on("ready", (cluster) => {
      if (require("./config.json").process.dashboard == true && cluster.id === 0) {
        global.bottype = require("./config.json").process.botmode;
        require("./server");
      }
      console.log(`Cluster ${cluster.id} is ready.`);
    });

    client.login(process.env.TOKEN);
    break;
  }
  case "dev": {
    const client = new PhoenixClient();
    client.cluster.on("ready", (cluster) => {
      if (require("./config.json").process.dashboard == true && cluster.id === 0) {
        global.bottype = require("./config.json").process.botmode;
        require("./server");
      }
      console.log(`Cluster ${cluster.id} is ready.`);
    });

    client.login(process.env.STAGINGTOKEN);
    break;
  }
  case "test": {
    const client = new PhoenixClient();
    client.cluster.on("ready", (cluster) => {
      if (require("./config.json").process.dashboard == true && cluster.id === 0) {
        global.bottype = require("./config.json").process.botmode;
        require("./server");
      }
      console.log(`Cluster ${cluster.id} is ready.`);
    });

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