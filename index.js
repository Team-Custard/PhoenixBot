console.log("SylveonBot v1.0.0");

// Registers environmental variables in the .env file for the bot's token.
// This is very important to run the bot as no token means no bot.
require("dotenv").config();

const { PossumClient } = require('./handlers/PossumClient');
const { container } = require('@sapphire/framework');

// Loads the bot's settings in the json file.
// Then adds the settings to container for access in commands.
const settings = require("./settings.json");
container.settings = settings;

// Connect to the database.
require('./Tools/Database').connect();


// Creates the bot and registers the prefixes and bot settings.
const { GatewayIntentBits } = require('discord.js');
const client = new PossumClient();

// Enables the bot to fetch to message edits.
// Useful if you made a mistake and don't wanna retype the command.
require('@sapphire/plugin-editable-commands/register');



// Begin logging into the bot once everything has been setup.
// It is best practice to have the bot login as the last thing here.
client.login(process.env.TOKEN);

process.on("exit" | "SIGTERM", () => {
  console.log("Shutting down..");
  require('./Tools/Database').disconnect();
  client.destroy();
  console.log("Goodbye!");
});