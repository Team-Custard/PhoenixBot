const { Schema, model } = require('mongoose');

const settingsSchema = new Schema({
    _id: { type: String, required: true },
    pronouns: [{ type: String, required: false, default: ["they", "them"] }],
    timezone: { type: String, required: false },
    blacklist: {
      enabled: { type: Boolean, required: false, default: false },
      reason: { type: String, required: false, default: false }
    }
  });

const settings = model('usersettings', settingsSchema);

module.exports = settings;