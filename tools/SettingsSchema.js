const { EmbedBuilder } = require("discord.js");

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
  utilities: Boolean,
  customBot: Boolean,
  blacklisted: Boolean,
  blacklistReason: String,
  disabledCommands: [String],
  permissionOverrides: [{
    role_id: String,
    grant: [String],
  }],
  tags: [
    {
      name: String,
      description: String,
      creator: String,
      embed: String,
    },
  ],
  cc: [
    {
      name: String,
      code: String,
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
    dmtext: String,
  },
  goodbyes: {
    channel: String,
    message: String,
  },
  logging: {
    members: String,
    users: String,
    messages: String,
    msgignorechannels: [String],
    moderation: String,
    infractions: String,
    roles: String,
    voice: String,
    commands: String,
  },
  rolesMenu: [{
    id: String,
    name: String,
    menutype: String,
    roles: [{
      emoji: String,
      role: String
    }]
  }],
  moderation: {
    system: [{
      warnings: String,
      punishment: String,
      duration: Number
    }],
    muteRole: String,
    shadowBannedRole: String,
    defaultMuteTime: String,
    autoDelete: String,
    modRole: String,
    alwaysConfirm: Boolean,
    reasonRequired: Boolean,
    lockdownChannels: [String],
    shadowbannedUsers: [{
      user: String,
      roles: [String]
    }]
  },
  automod: {
    muteduration: String,
    reportchannel: String,
    pingreport: String,
    nsfwimage: [],
    nsfwweight: {type: Number, default: 50},
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
      creationDate: String,
    },
  ],
  leveling: {
    enable: {type: Boolean, default: false},
    users: [{
      id: String,
      xp: {type: Number, default: 0},
      level: {type: Number, default: 0},
    }],
    blacklistRole: [String],
    blacklistChannels: [String],
    stackRoles: {type: Boolean, default: true},
    rates: {
      minimum: {type: Number, default: 5},
      maximum: {type: Number, default: 15}
    },
    levelRoles: [{
      level: String,
      roleId: String,
    }],
    message: {type: String, default: `Congrats {{mention}}, you've reached level **{{level}}**!`},
    announceChannel: String,
    backgroundTransparency: {type: Number, default: 90},
    useEmbed: Boolean,
  },
  embeds: [{
    name: String,
    data: {
      author: {
        name: String,
        icon_url: String,
        url: String
      },
      title: String,
      url: String,
      description: String,
      thumbnail: String,
      image: String,
      fields: [{
        name: String,
        value: String,
        inline: Boolean,
      }],
      footer: {
        text: String,
        icon_url: String,
      },
      timestamp: Number
    }
  }]
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
