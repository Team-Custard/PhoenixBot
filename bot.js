// Entry point for a single bot cluster. Spawned by index.js through the
// discord-hybrid-sharding ClusterManager (or required directly in custom mode).
require("dotenv").config();

const fs = require("fs");
const { fork } = require("child_process");
const { botmode, settings, token } = require("./tools/config");

require("./tools/database").connect();

if (botmode === "custom") {
  startCustomBots();
}
else {
  const { PhoenixClient } = require("./tools/PhoenixClient");
  const client = new PhoenixClient();

  client.cluster.on("ready", (cluster) => {
    // The web dashboard lives on cluster 0 so it can use the bot client directly.
    if (settings.process.dashboard === true && cluster.id === 0) {
      global.bottype = botmode;
      require("./server");
    }
    console.log(`Cluster ${cluster.id} is ready.`);
  });

  client.login(token());
}

// Deprecated: custom bots are separate processes, each with its own token.
function startCustomBots() {
  const bots = JSON.parse(fs.readFileSync(__dirname + "/custombots.json", "utf8"));
  console.log(`[warning] Custom bot mode is deprecated and will be removed in a future version.`);
  console.log(
    `Starting ${bots.length} custom bot(s). This will take about ${Math.floor((bots.length * 1500) / 1000)} seconds.`,
  );
  bots.forEach((bot, index) => {
    setTimeout(() => {
      console.log(`Starting bot ${bot.client}`);
      fork(`${__dirname}/custombot.js`).send(bot.token);
    }, 1500 * index);
  });
}
