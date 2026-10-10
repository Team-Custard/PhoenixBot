require("dotenv").config();

const fs = require("fs");
const { ClusterManager } = require("discord-hybrid-sharding");
const { settings, botmode, token } = require("./tools/config");

if (settings.process.noIntro === false) {
  console.log();
  console.log(fs.readFileSync(__dirname + "/tools/phoenixAscii.txt").toString());
  console.log();
  console.log("--------------------------------");
  console.log("Version: %s\nCreated by: Team Custard", require("./package.json").version);
  console.log("--------------------------------");
  console.log(
    `Starting the following services:\n${settings.process.botclient ? "Bot client\n" : ""}${settings.process.dashboard ? "Web dashboard\n" : ""}`,
  );
}

if (settings.process.botclient === true) {
  if (botmode === "custom") {
    require("./bot");
  }
  else {
    new ClusterManager(`${__dirname}/bot.js`, {
      totalShards: "auto",
      shardsPerClusters: 4,
      mode: "process",
      token: token(),
    })
      .on("clusterCreate", (cluster) => console.log(`Launched Cluster ${cluster.id}`))
      .spawn({ timeout: -1 });
  }
}
else if (settings.process.dashboard === true) {
  // Dashboard-only mode: no bot client, so the dashboard talks to Discord over REST.
  require("./tools/database").connect();
  require("./server");
}
