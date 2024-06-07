const { SapphireClient } = require('@sapphire/framework');
const { GatewayIntentBits } = require('discord.js');

const client = new SapphireClient({
    intents: [GatewayIntentBits.MessageContent, GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
    loadDefaultErrorListeners: true,
    loadSubcommandErrorListeners: true
});


client.login(require('./config.json').process.botmode == "dev" ? process.env["DEVTOKEN"] : process.env["TOKEN"]);

exports.client = client;