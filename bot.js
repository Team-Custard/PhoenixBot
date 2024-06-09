const { PhoenixClient } = require("./tools/PhoenixClient");

const client = new PhoenixClient();

switch (require("./config.json").process.botmode) {
  case "prod": {
    client.login(process.env.TOKEN);
    break;
  }
  case "dev": {
    client.login(process.env.STAGINGTOKEN);
    break;
  }
  case "test": {
    client.login(process.env.TESTTOKEN);
    break;
  }
}

exports.client = client;
