const { Schema, model } = require("mongoose");
const { SpeedGooseCacheAutoCleaner } = require("speedgoose");

const settingsSchema = new Schema({
  _id: { type: String, required: true },
  prefix: {
    type: String,
    required: false,
    default: require("../config.json").process.botmode == "prod" ? "=" : "==",
  },
  stagingprefix: { type: String, required: false, default: "==" },
  enablePrefix: { type: Boolean, required: false, default: true },
  donatorUser: String,
  customBot: Boolean,
  tags: [
    {
      name: String,
      description: String,
      creator: String,
    },
  ],
  lockTags: Boolean,

  verification: {
    role: String,
    messageText: String,
    verifiedText: String,
  },
  welcomer: {
    channel: String,
    message: String,
  },
  goodbyes: {
    channel: String,
    message: String,
  },
  logging: {
    members: String,
    messages: String,
    moderation: String,
    infractions: String,
    roles: String,
    voice: String,
  },
  moderation: {
    muteRole: String,
    defaultMuteTime: String,
    autoDelete: String,
    modRole: String,
    alwaysConfirm: Boolean,
    reasonRequired: Boolean,
    lockdownChannels: [String],
  },
  automod: {
    muteduration: String,
    reportchannel: String,
    pingreport: String,
    nsfwimage: [],
  },
  starboard: {
    emoji: String,
    channel: String,
    threshold: String,
    selfstar: Boolean,
  },
  infractions: [
    {
      id: Number,
      punishment: String,
      member: String,
      moderator: String,
      reason: String,
      expiretime: String,
      expired: Boolean,
      hidden: Boolean,
      modlogID: String,
    },
  ],
}).plugin(SpeedGooseCacheAutoCleaner);

const settings = model(
  require("../config.json").process.botmode == "prod" ||
    require("../config.json").process.botmode == "custom"
    ? "settings"
    : "settingsStaging",
  settingsSchema,
);

module.exports = settings;
exports.upsert = { upsert: true, setDefaultsOnInsert: true };
