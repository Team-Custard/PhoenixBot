const { Schema, model } = require('mongoose');

const settingsSchema = new Schema({
    _id: { type: String, required: true },
    prefix: { type: String, required: false, default: "=" },
    tags: [{
        name: String,
        description: String,
        creator: String
    }]
  });

const settings = model('settings', settingsSchema);

module.exports = settings;
exports.upsert = { upsert: true, setDefaultsOnInsert: true };