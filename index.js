const settings = require("./config.json");
const { ShardingManager } = require('discord.js');
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
  const manager = new ShardingManager('./bot.js', { totalShards: 'auto',  token: process.env[(settings.process.botmode == "prod" ? "TOKEN" : (settings.process.botmode == "dev" ? "STAGINGTOKEN" : "TESTTOKEN"))] })
    .on('shardCreate', shard => console.log(`Launched shard ${shard.id}`))
    .spawn();
  } else {
    require("./bot");
  }
}
else if (settings.process.dashboard == true) {
  require("./tools/database").connect();
  require("./server");
}
