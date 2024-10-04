const settings = require("./config.json");
const { ClusterManager } = require('discord-hybrid-sharding');
require("dotenv").config();

if (settings.process.noIntro == false) {
  console.log();
  console.log(
    require("fs")
      .readFileSync(__dirname + "/tools/phoenixAscii.txt")
      .toString(),
  );
  console.log();
  console.log();
  console.log("--------------------------------");
  console.log(
    "Version: %s\nCreated by: Team Custard",
    require("./package.json").version,
  );
  console.log("--------------------------------");
  console.log(
    `Starting the following services:\n${settings.process.botclient == true ? "Bot client\n" : ""}${settings.process.dashboard == true ? "Web dashboard\n" : ""}`,
  );
}

if (settings.process.botclient == true) {
  if (settings.process.botmode != "custom") {
    new ClusterManager(`${__dirname}/bot.js`, {
      totalShards: 'auto',
      shardsPerClusters: 4,
      // totalClusters: 7,
      mode: 'process',
      token: process.env[(settings.process.botmode == "prod" ? "TOKEN" : (settings.process.botmode == "dev" ? "STAGINGTOKEN" : "TESTTOKEN"))],
    })
    .on('clusterCreate', cluster => console.log(`Launched Cluster ${cluster.id}`))
    .spawn({ timeout: -1 });
  } else {
    require("./bot");
  }
}
else if (settings.process.dashboard == true) {
  require("./tools/database").connect();
  require("./server");
}
