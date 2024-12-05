const { PhoenixClient } = require("./tools/PhoenixClient");
const fs = require("fs");
const clients = [];

process.on(`message`, function (msg) {
  const theowner = JSON.parse(
    fs.readFileSync(__dirname + "/custombots.json", "utf8"),
  ).find((b) => b.token == msg);
  if (theowner) {
    exports.owner = theowner;
    require("./tools/database").connect();
    const client = new PhoenixClient();
    client.login(msg);
  }
});

exports.clients = clients;
exports.list = __dirname + "/custombots.json";
