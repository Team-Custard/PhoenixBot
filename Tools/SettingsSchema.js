const { Schema, model } = require('mongoose');

const settingsSchema = new Schema({
    _id: { type: String, required: true },
    prefix: [{ type: String, required: false, default: "=", maxlength: 6 }],
    modonly: { type: Boolean, required: false, default: false },
    modules: [{
        general: { type: Boolean, required: false, default: true },
        moderation: { type: Boolean, required: false, default: true },
        utility: { type: Boolean, required: false, default: true },
        fun: { type: Boolean, required: false, default: true },
        leveling: { type: Boolean, required: false, default: false },
        music: { type: Boolean, required: false, default: false },
        logging: { type: Boolean, required: false, default: false }
    }],
    channels: [{
        welcome: Number,
        leave: Number,
        modlog: Number,
        messagelog: Number,
        voicelog: Number,
        joinlog: Number,
        rolelog: Number
    }],
    roles: [{
        afterOnboarding: { type: Boolean, required: false, default: false },
        autoroles: [Number],
        modrole: Number,
        adminrole: Number,
        muterole: Number
      }],
    moderation: [{
        useTimeouts: { type: Boolean, required: false, default: true },
        dmOffender: { type: Boolean, required: false, default: true },
        banDefaultDays: { type: Boolean, required: false, default: 0 },
        banAppealLink: String,
        reasonrequired: { type: Boolean, required: false, default: false }
    }]
  });

const settings = model('settings', settingsSchema);

module.exports = settings;