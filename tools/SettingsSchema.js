const { Schema, model } = require("mongoose");
const { SpeedGooseCacheAutoCleaner } = require("speedgoose");

const settingsSchema = new Schema({
  _id: { type: String, required: true },
  prefix: { type: String, required: false, default: "=" },
  stagingprefix: { type: String, required: false, default: "==" },
  enablePrefix: { type: Boolean, required: false, default: true },
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
  vanity: {
    url: String,
    description: String,
    invite: String,
  },
}).plugin(SpeedGooseCacheAutoCleaner);

const settings = model("settings", settingsSchema);

module.exports = settings;
exports.upsert = { upsert: true, setDefaultsOnInsert: true };
