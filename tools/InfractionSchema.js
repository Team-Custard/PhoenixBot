const { Schema, model } = require("mongoose");
const { SpeedGooseCacheAutoCleaner } = require("speedgoose");

const settingsSchema = new Schema({
  _id: { type: String, required: false, default: `inf` },
  timers: [{
    id: String,
    guildId: String,
    expire: String,
    punishment: String
  }]
}).plugin(SpeedGooseCacheAutoCleaner);

const settings = model("infractions", settingsSchema);

module.exports = settings;
exports.upsert = { upsert: true, setDefaultsOnInsert: true };
