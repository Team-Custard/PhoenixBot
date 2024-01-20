const { Schema, model } = require('mongoose');

const settingsSchema = new Schema({
    _id: { type: String, required: true },
    pronouns: [{ type: String, required: false, default: ["they", "them"] }],
    timezone: { type: String, required: false }
  });

const settings = model('usersettings', settingsSchema);

module.exports = settings;