const mongoose = require("mongoose");
const { applySpeedGooseCacheLayer } = require("speedgoose");
const { botmode } = require("./config");
const settings = require("./SettingsSchema");

// Query logging is very noisy and slows everything down; only enable it outside prod
// or when explicitly asked for.
mongoose.set("debug", process.env.MONGO_DEBUG === "true" || (botmode !== "prod" && process.env.MONGO_DEBUG !== "false"));

let cacheLayer;

const connect = async () => {
  // The Redis query cache (speedgoose) has to be in place before the first query.
  cacheLayer ??= applySpeedGooseCacheLayer(mongoose, { redisUri: process.env["redisurl"] })
    .then(() => console.log(`Success in connecting to redis.`))
    .catch((err) => console.error(`Error in connecting to redis.`, err));
  await cacheLayer;
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
    await mongoose.disconnect();
    console.log("Success in disconnecting from mongodb.");
  }
  catch (err) {
    console.error("Failed to disconnect from mongodb.", err);
  }
};

/**
 * Makes sure a settings document exists for a guild. Uses an upsert so two
 * clusters racing on the same guild can't create duplicates.
 */
const initGuildDatabase = async (guildId) => {
  try {
    await settings.updateOne(
      { _id: guildId },
      { $setOnInsert: { _id: guildId } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    return ["ok"];
  }
  catch (err) {
    console.error("Failed to initialize the database.", err);
    return ["error", err];
  }
};

const cleanupGuildDatabase = async (guildId) => {
  try {
    await settings.findByIdAndDelete(guildId);
    // Cases and levels live in their own collections now.
    await require("./models/Case").deleteMany({ guildId });
    await require("./models/LevelMember").deleteMany({ guildId });
    console.log(`Deleted database for ${guildId}`);
    return ["ok"];
  }
  catch (err) {
    console.error("Failed to delete the database.", err);
    return ["error", err];
  }
};

exports.connect = connect;
exports.disconnect = disconnect;
exports.initGuildDatabase = initGuildDatabase;
exports.cleanupGuildDatabase = cleanupGuildDatabase;
