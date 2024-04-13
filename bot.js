const { SapphireClient } = require('@sapphire/framework');
const { GatewayIntentBits } = require('discord.js');

require('./tools/database').connect();

const client = new SapphireClient({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });


client.login(require('./config.json').process.botmode == "dev" ? process.env["DEVTOKEN"] : process.env["TOKEN"]);