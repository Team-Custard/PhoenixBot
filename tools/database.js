const mongoose = require("mongoose").set('debug', true);
const settings = require("./SettingsSchema");
const config = require('../config.json');
const { applySpeedGooseCacheLayer } = require('speedgoose');

applySpeedGooseCacheLayer(mongoose, {
  redisUri: process.env["redisurl"]
})
.then(() => console.log(`Success in connecting to redis.`))
.catch((err) => console.error(`Error in connecting to redis.`, err));

const connect = async () => {
  try {
    await mongoose.connect(process.env["mongourl"]);
    console.log("Success in connecting to mongodb.");
  }
  catch (err) {
    console.error("Error in connecting to mongodb.", err);
  }
};

const disconnect = async () => {
  try {
    mongoose.disconnect();
    console.log("Success in disconnecting from mongodb.");
  }
  catch (err) {
    console.error("Failed to disconnect from mongodb.", err);
  }
};

const initGuildDatabase = async (guild) => {
  try {
    // Check if database exists
    let gset = await settings.findById(guild).cacheQuery();
    if (!gset) {
      // Database does not exist. Initialize it.
      gset = new settings({ _id: guild });
      gset.save();
      return ["ok"];
    }
    else {
      return ["ok"];
    }
  }
  catch (err) {
    console.error('Failed to initialize the database.', err);
    return ["error", err];
  }
};

const cleanupGuildDatabase = async (guild, members) => {
  try {
    // Runs a check to see if staging or prod is found in the server.
    if (members.cache.get(config.process.botmode == "dev" ? "1171286616967479377" : "1227318291475730443")) return console.log(`Not deleting database for ${guild} since another phoenixbot was found.`);
    await settings.findByIdAndDelete(guild.id).cacheQuery()
      .then(() => console.log(`Deleted database for ${guild.id}`))
      .catch((err) => console.error(`Error deleting database for ${guild.id}`, err));
    return ["ok"];
  }
  catch (err) {
    console.error('Failed to delete the database.', err);
    return ["error", err];
  }
};

const fetch = async (guild) => {
  try {
    const guildSettings = await settings.findById(guild);
    return ["ok", guildSettings];
  }
  catch (err) {
    console.error('Failed to read the database.', err);
    return ["error", err];
  }
};

const set = async (guild, option, option2) => {
  try {
    await settings.findByIdAndUpdate(guild, { option: option2 });
    return ["ok", `Set ${option} to ${option2}.`];
  }
  catch (err) {
    console.error('Failed to write to the database.', err);
    return ["error", err];
  }
};


exports.connect = connect;
exports.disconnect = disconnect;
exports.fetch = fetch;
exports.set = set;
exports.initGuildDatabase = initGuildDatabase;
exports.cleanupGuildDatabase = cleanupGuildDatabase;