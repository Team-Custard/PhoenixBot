const { Schema, model } = require('mongoose');

const settingsSchema = new Schema({
    _id: { type: String, required: true },
    timezone: String,
    pronouns: String,
    description: String,
    socials: {
        youtube: String,
        twitter: String,
        reddit: String,
        server: String
    },
    afk: {
        since: String,
        status: String
    }
  });

const settings = model('userdb', settingsSchema);

module.exports = settings;
exports.upsert = { upsert: true, setDefaultsOnInsert: true };