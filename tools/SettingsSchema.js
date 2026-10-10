const { Schema, model } = require("mongoose");
const { SpeedGooseCacheAutoCleaner } = require("speedgoose");

/** One automod filter: on/off, what to do and its own options. */
function filter(options = {}, action = "delete") {
  return {
    enabled: { type: Boolean, default: false },
    action: { type: String, default: action },
    duration: { type: Number, default: 10 * 60 * 1000 },
    ...options,
  };
}

const settingsSchema = new Schema({
  _id: { type: String, required: true },
  prefix: {
    type: String,
    required: false,
    // The bot mode's default prefix (= for prod, == for dev, === for test).
    default: () => require("./config").defaultPrefix,
  },
  stagingprefix: { type: String, required: false, default: "==" },
  enablePrefix: { type: Boolean, required: false, default: true },
  donatorUser: String,
  utilities: Boolean,
  customBot: Boolean,
  blacklisted: Boolean,
  blacklistReason: String,
  disabledCommands: [String],
  whitelistedRoles: [String],
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
    unverifiedRole: String,
    managerRole: String,
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
    automod: String,
    roles: String,
    voice: String,
    commands: String,
    verification: String,
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
    appealLink: String,
    lockdownChannels: [String],
    shadowbannedUsers: [{
      user: String,
      roles: [String]
    }]
  },
  automod: {
    autokick: {
      duration: Number,
      neededRole: String
    },
    minimumAge: Number,
    // Message filters (listeners/automod/automodMessage.js, tools/automod.js).
    ignoreModerators: { type: Boolean, default: true },
    exemptRoles: [String],
    exemptChannels: [String],
    notifyChannel: { type: Boolean, default: true },
    filters: {
      spam: filter({ maxMessages: { type: Number, default: 6 }, seconds: { type: Number, default: 5 } }, "mute"),
      duplicates: filter({ count: { type: Number, default: 4 } }),
      invites: filter({ allowOwnServer: { type: Boolean, default: true } }),
      links: filter({ allowedDomains: [String] }),
      mentions: filter({ max: { type: Number, default: 6 } }, "warn"),
      caps: filter({ percent: { type: Number, default: 70 }, minLength: { type: Number, default: 12 } }),
      words: filter({ words: [String] }),
      emojis: filter({ max: { type: Number, default: 10 } }),
      lines: filter({ max: { type: Number, default: 15 } }),
    },
    // Punishments for Discord's own AutoMod rules (listeners/automod/discordAutomod.js).
    discordRules: [{
      ruleId: String,
      action: String,
      duration: Number,
    }],
  },
  starboard: {
    emoji: String,
    channel: String,
    threshold: String,
    selfstar: Boolean,
  },
  leveling: {
    enable: { type: Boolean, default: false },
    // Show the top of the leaderboard on the website (/leaderboard/<server id>).
    publicLeaderboard: { type: Boolean, default: true },
    blacklistRole: [String],
    blacklistChannels: [String],
    stackRoles: { type: Boolean, default: true },
    rates: {
      minimum: { type: Number, default: 5 },
      maximum: { type: Number, default: 15 }
    },
    levelRoles: [{
      level: String,
      roleId: String,
    }],
    message: { type: String, default: `Congrats {{mention}}, you've reached level **{{level}}**!` },
    announceChannel: String,
    backgroundTransparency: { type: Number, default: 90 },
    useEmbed: Boolean,
  },
  embeds: [{
    name: String,
    data: {
      // 0xRRGGBB; empty means Phoenix orange.
      color: Number,
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
      // Milliseconds since 1970.
      timestamp: Number
    }
  }]
}).plugin(SpeedGooseCacheAutoCleaner);

// Moderation cases and leveling progress used to be stored in this document too;
// they now live in tools/models/Case.js and tools/models/LevelMember.js.
// Run `npm run migrate` once to move existing data over.

const settings = model(
  require("./config").usesProdCollections ? "settings" : "settingsStaging",
  settingsSchema,
);

module.exports = settings;
