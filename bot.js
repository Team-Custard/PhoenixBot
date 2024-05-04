const { PhoenixClient } = require('./tools/PhoenixClient');

const client = new PhoenixClient();

client.login(require('./config.json').process.botmode == "dev" ? process.env["DEVTOKEN"] : process.env["TOKEN"]);

exports.client = client;