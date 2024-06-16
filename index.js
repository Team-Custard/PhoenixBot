const settings = require("./config.json");
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

require("./tools/database").connect();

global.bottype = require("./config.json").process.botmode;

if (settings.process.botclient == true) {
  require("./bot");
}
if (settings.process.dashboard == true) {
  require("./server");
}
