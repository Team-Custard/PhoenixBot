const { SapphireClient } = require('@sapphire/framework');
const { GatewayIntentBits } = require('discord.js');

require('dotenv').config();

const client = new SapphireClient({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.login(process.env["TOKEN"]);