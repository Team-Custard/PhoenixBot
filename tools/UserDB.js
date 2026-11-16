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

  blacklist: {
    reportBlacklist: Boolean,
    reportReason: String,
    botBlacklist: Boolean,
    blackReason: String,
  },
  reportedServers: [],

  afk: {
    since: String,
    status: String,
    // Where they were mentioned while away (the last 25), shown when they're back.
    mentions: [{
      _id: false,
      guildId: String,
      channelId: String,
      messageId: String,
      authorId: String,
      at: Number,
    }],
  },
  ephemeral: Boolean,
}).plugin(SpeedGooseCacheAutoCleaner);

const settings = model("userdb", settingsSchema);
if (config.userdb.global) {
  module.exports = settings;
}
