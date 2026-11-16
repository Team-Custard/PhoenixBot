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

/** Welcome or goodbye card settings (the background image is a file, see tools/greetingCard.js). */
function greetingCard() {
  return {
    enabled: { type: Boolean, default: false },
    title: String,
    subtitle: String,
    footer: String,
    // How much the background is darkened, 0-100.
    overlay: Number,
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
      // Delete the message (or hide the slash command) that showed the tag.
      deleteCommand: { type: Boolean, default: false },
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
    // Saved embed for the verification panel, instead of the default orange box.
    embed: String,
    verifiedText: String,
  },
  // The counting channel (tools/counting.js).
  counting: {
    channel: String,
    react: { type: Boolean, default: true },
    reactEmoji: String,
    allowTwiceInRow: { type: Boolean, default: false },
    resetOnMistake: { type: Boolean, default: false },
    // A role given for a while to people who make too many mistakes in a day.
    mistakeRole: String,
    mistakeLimit: { type: Number, default: 3 },
    mistakeRoleDuration: { type: Number, default: 3_600_000 },
  },
  // Accounts to announce new posts and live streams from (tools/notifications).
  notifications: [{
    _id: false,
    platform: String,
    account: String,
    channel: String,
    // "all", "live" (live streams only) or "posts" (uploads and posts only).
    events: { type: String, default: "all" },
    role: String,
    content: String,
    embed: String,
    enabled: { type: Boolean, default: true },
  }],
  // Messages in these announcement channels are published automatically.
  autopublish: {
    channels: [String],
    includeBots: { type: Boolean, default: true },
  },
  // The emojis Phoenix uses in its replies here (empty = Phoenix's own).
  statusEmojis: {
    success: String,
    error: String,
    warning: String,
    info: String,
  },
  welcomer: {
    channel: String,
    message: String,
    // Saved embeds (from the Embeds page) sent with the welcome message and DM.
    embed: String,
    dmtext: String,
    dmEmbed: String,
    // An image card with the member's avatar (tools/greetingCard.js).
    card: greetingCard(),
  },
  goodbyes: {
    channel: String,
    message: String,
    embed: String,
    card: greetingCard(),
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
    dashboard: String,
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
    }],
    // How long warnings count by default, in ms (empty = forever).
    warningExpiry: Number,
    // The server's own reasons, suggested in the mod commands, and whether they're required.
    reasons: [String],
    enforceReasons: { type: Boolean, default: false },
    // Replaces Phoenix's "Banned so-and-so" replies (text and/or a saved embed).
    successMessage: String,
    successEmbed: String,
  },
  automod: {
    autokick: {
      duration: Number,
      neededRole: String
    },
    minimumAge: Number,
    // Kick people who join with Discord's default avatar.
    kickDefaultAvatar: { type: Boolean, default: false },
    // A channel nobody should post in; whoever does is punished (listeners/automod/honeypot.js).
    honeypot: {
      channel: String,
      action: { type: String, default: "ban" },
      // Also delete their other messages from the past hour.
      cleanup: { type: Boolean, default: true },
      warning: String,
      // Saved embed for the warning, instead of the plain red box.
      embed: String,
    },
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
    // XP multipliers for roles: the biggest one a member has counts.
    multipliers: [{ roleId: String, multiplier: Number }],
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
    // Saved embed sent with level up messages.
    embed: String,
    announceChannel: String,
    backgroundTransparency: { type: Number, default: 90 },
    useEmbed: Boolean,
  },
  // What Phoenix says about AFK members (listeners/internal/messageCreateAfkCheck.js).
  afk: {
    enabled: { type: Boolean, default: true },
    message: String,
    embed: String,
    welcomeBack: { type: Boolean, default: true },
    welcomeBackMessage: String,
    // List where they were mentioned when someone comes back.
    showMentions: { type: Boolean, default: true },
  },
  // The bot's server profile bio as last set on the dashboard (Discord doesn't send it back).
  botProfile: { bio: String },
  // Replies when a message matches a trigger (listeners/messages/autoresponse.js).
  autoresponses: [{
    trigger: String,
    match: { type: String, default: "contains" },
    matchCase: { type: Boolean, default: false },
    content: String,
    embed: String,
    channels: [String],
    reply: { type: Boolean, default: true },
    enabled: { type: Boolean, default: true },
  }],
  // Posted every so often (tools/timedMessages.js).
  timedMessages: [{
    channel: String,
    interval: Number,
    onlyWhenActive: { type: Boolean, default: false },
    content: String,
    embed: String,
    enabled: { type: Boolean, default: true },
  }],
  // Kept as the last message in a channel (listeners/messages/sticky.js).
  stickyMessages: [{
    channel: String,
    content: String,
    embed: String,
    cooldown: { type: Number, default: 15_000 },
    enabled: { type: Boolean, default: true },
  }],
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
