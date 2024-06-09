const { Schema, model } = require("mongoose");
const { SpeedGooseCacheAutoCleaner } = require("speedgoose");
const config = require("../config.json");

const settingsSchema = new Schema({
  _id: { type: String, required: true },
  timezone: String,
  pronouns: String,
  description: String,
  socials: {
    youtube: String,
    twitter: String,
    reddit: String,
    server: String,
  },
  afk: {
    since: String,
    status: String,
  },
  ephemeral: Boolean,
}).plugin(SpeedGooseCacheAutoCleaner);

const settings = model("userdb", settingsSchema);
if (config.userdb.global) {
  module.exports = settings;
  exports.upsert = { upsert: true, setDefaultsOnInsert: true };
}
