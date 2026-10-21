// The dashboard's settings, described once. The API uses this to validate and save
// changes, and the React app uses the same description to draw the forms, so a new
// setting only has to be added here.
//
// Field types:
//   text, textarea   strings (max = max length)
//   toggle           boolean
//   number           integer (min / max)
//   duration         milliseconds (min / max), shown with a unit picker
//   channel          one channel id   (channelTypes: allowed Discord channel types)
//   channels         list of channel ids
//   role, roles      one / several role ids
//   emoji            a unicode emoji or a custom emoji like <:name:id>
//   url              an https:// link
//   commands         list of command names
//   select           one of `options`
//   list             a table of rows, each row described by `fields`
//   strings          a list of short texts, like blocked words (max = how many, itemMax = length)
//   automodRule      one of the server's Discord AutoMod rules
//   embed            the name of one of the server's saved embeds
//
// Other field options: group (fields with the same group are drawn together, see the
// section's `groups`), showIf (only show the field when another field is on, or when
// { key, in: [values] } matches; a list of these must all match), decimal (numbers
// with decimals), wide (list fields that take a whole row). Sections can set
// placeholders: true to show the placeholder list.

// Discord channel types: text and announcement channels.
const TEXT_CHANNELS = [0, 5];
// Plus voice, stage, forum, media and categories.
const LOGGABLE_CHANNELS = [0, 5, 2, 13, 15, 16, 4];


const PUNISHMENTS = [
  { value: "warn", label: "Warn" },
  { value: "mute", label: "Mute" },
  { value: "kick", label: "Kick" },
  { value: "ban", label: "Ban" },
];

const FILTER_ACTIONS = [
  { value: "delete", label: "Delete the message" },
  { value: "warn", label: "Delete and warn" },
  { value: "mute", label: "Delete and mute" },
  { value: "kick", label: "Delete and kick" },
  { value: "ban", label: "Delete and ban" },
];

/** The fields for one automod filter: on/off, its options, what to do and for how long. */
function filterFields(name, options) {
  const base = `automod.filters.${name}`;
  const enabled = `${base}.enabled`;
  return [
    { key: enabled, type: "toggle", label: "Filter on", group: name, groupToggle: true },
    ...options.map((field) => ({ ...field, key: `${base}.${field.key}`, group: name, showIf: enabled })),
    { key: `${base}.action`, type: "select", label: "Then", required: true, options: FILTER_ACTIONS, group: name, showIf: enabled },
    {
      key: `${base}.duration`,
      type: "duration",
      label: "For",
      min: 0,
      max: 365 * 86_400_000,
      group: name,
      showIf: [enabled, { key: `${base}.action`, in: ["mute", "ban"] }],
      help: "0 = permanent. Mutes over 28 days use the mute role.",
    },
  ];
}

const sections = [
  {
    id: "general",
    name: "General",
    description: "Prefix commands and who can use which command.",
    fields: [
      { key: "enablePrefix", type: "toggle", label: "Prefix commands", help: "Slash commands always work. Prefix commands are being phased out, so you can turn them off early." },
      { key: "prefix", type: "text", label: "Prefix", min: 1, max: 5, noSpaces: true, help: "What prefix commands start with, like = or !." },
      { key: "disabledCommands", type: "commands", label: "Disabled commands", help: "These commands can't be used in this server." },
      {
        key: "permissionOverrides",
        type: "list",
        label: "Permission overrides",
        help: "Let a role use commands it normally wouldn't have permission for.",
        max: 25,
        fields: [
          { key: "role_id", type: "role", label: "Role", required: true },
          { key: "grant", type: "commands", label: "Commands" },
        ],
      },
    ],
  },
  {
    id: "moderation",
    name: "Moderation",
    description: "Roles and rules used by the moderation commands.",
    fields: [
      { key: "moderation.muteRole", type: "role", label: "Mute role", assignable: true, help: "Used for mutes longer than 28 days or without a duration." },
      { key: "moderation.shadowBannedRole", type: "role", label: "Shadowban role", assignable: true, help: "The only role a shadowbanned member keeps." },
      { key: "moderation.appealLink", type: "url", label: "Ban appeal link", help: "Shown as a button in the DM people get when they're banned." },
      { key: "whitelistedRoles", type: "roles", label: "Role command whitelist", assignable: true, help: "If set, the role command can only hand out these roles." },
      {
        key: "moderation.system",
        type: "list",
        label: "Punishment system",
        help: "Automatically punish members when they reach a number of active warnings.",
        max: 20,
        uniqueBy: "warnings",
        fields: [
          { key: "warnings", type: "number", label: "Warnings", min: 1, max: 100, required: true },
          {
            key: "punishment",
            type: "select",
            label: "Action",
            required: true,
            options: [
              { value: "mute", label: "Mute" },
              { value: "kick", label: "Kick" },
              { value: "shadowban", label: "Shadowban" },
              { value: "ban", label: "Ban" },
            ],
          },
          { key: "duration", type: "duration", label: "For", min: 0, max: 365 * 86_400_000, help: "Required for mutes. Leave at 0 for a permanent ban." },
        ],
      },
    ],
  },
  {
    id: "logging",
    name: "Logging",
    description: "Pick a channel for each kind of log. Leave a log empty to turn it off.",
    fields: [
      { key: "logging.messages", type: "channel", channelTypes: TEXT_CHANNELS, label: "Message edits and deletes" },
      { key: "logging.members", type: "channel", channelTypes: TEXT_CHANNELS, label: "Joins, leaves and nicknames" },
      { key: "logging.users", type: "channel", channelTypes: TEXT_CHANNELS, label: "Username and avatar changes" },
      { key: "logging.roles", type: "channel", channelTypes: TEXT_CHANNELS, label: "Role changes" },
      { key: "logging.voice", type: "channel", channelTypes: TEXT_CHANNELS, label: "Voice channel activity" },
      { key: "logging.moderation", type: "channel", channelTypes: TEXT_CHANNELS, label: "Bans and timeouts" },
      { key: "logging.infractions", type: "channel", channelTypes: TEXT_CHANNELS, label: "Phoenix cases", help: "Every warn, mute, kick and ban made with Phoenix." },
      { key: "logging.automod", type: "channel", channelTypes: TEXT_CHANNELS, label: "Automod" },
      { key: "logging.verification", type: "channel", channelTypes: TEXT_CHANNELS, label: "Verification" },
      { key: "logging.dashboard", type: "channel", channelTypes: TEXT_CHANNELS, label: "Dashboard changes", help: "Who changed what on this dashboard. The Audit log page always has the full list." },
      { key: "logging.commands", type: "channel", channelTypes: TEXT_CHANNELS, label: "Commands used", help: "Needed for the echo command, so you can see who made the bot talk." },
      { key: "logging.msgignorechannels", type: "channels", channelTypes: LOGGABLE_CHANNELS, label: "Don't log messages from", help: "Channels or categories to leave out of message logs." },
    ],
  },
  {
    id: "joins",
    name: "Join gate",
    description: "Keep raiders and throwaway accounts out.",
    fields: [
      { key: "automod.minimumAge", type: "duration", label: "Minimum account age", min: 0, max: 365 * 86_400_000, units: ["day"], help: "Kick accounts younger than this when they join. 0 turns it off." },
      { key: "automod.autokick.duration", type: "duration", label: "Autokick after", min: 0, max: 30 * 86_400_000, minNonZero: 15_000, help: "Kick new members who don't get a role within this time. 0 turns it off." },
      { key: "automod.autokick.neededRole", type: "role", label: "Role they need", help: "Leave empty to accept any role." },
      { key: "automod.kickDefaultAvatar", type: "toggle", label: "Kick accounts without a profile picture", help: "New members still using Discord's default avatar are kicked and told why. Raid and spam accounts rarely set one." },
    ],
  },
  {
    id: "automod",
    name: "Automod",
    description: "Phoenix's message filters. Turn on the ones you want and pick what happens to people who trip them. Actions are logged to the Automod log channel.",
    groups: {
      everyone: { label: "Who automod checks" },
      spam: { label: "Spam", help: "Too many messages in a short time. The whole burst is deleted." },
      duplicates: { label: "Repeated messages", help: "The same message sent again and again within 30 seconds." },
      invites: { label: "Server invites", help: "Invite links to other Discord servers." },
      links: { label: "Links", help: "Any link, except to the sites you allow." },
      mentions: { label: "Mass mentions", help: "Mentioning lots of people or roles in one message." },
      caps: { label: "Capital letters", help: "MESSAGES THAT SHOUT." },
      words: { label: "Blocked words", help: "Words and phrases that aren't allowed. Catches l00k-alike spellings too." },
      emojis: { label: "Emoji spam", help: "Too many emojis in one message." },
      lines: { label: "Wall of text", help: "Messages with lots of lines." },
      honeypot: { label: "Honeypot channel", help: "Spam bots post in every channel they can see. Anyone (except moderators) who posts in this one has the message deleted and is punished at once." },
    },
    fields: [
      { key: "automod.ignoreModerators", type: "toggle", label: "Ignore moderators", group: "everyone", help: "People who can delete messages, time out, kick or ban aren't checked. Server managers never are." },
      { key: "automod.exemptRoles", type: "roles", label: "Ignored roles", group: "everyone" },
      { key: "automod.exemptChannels", type: "channels", channelTypes: LOGGABLE_CHANNELS, label: "Ignored channels", group: "everyone", help: "Channels or whole categories automod leaves alone." },
      { key: "automod.notifyChannel", type: "toggle", label: "Tell people why", group: "everyone", help: "Post a short note in the channel (deleted after a few seconds) when a message is removed." },
      { key: "automod.honeypot.channel", type: "channel", channelTypes: TEXT_CHANNELS, label: "Honeypot channel", group: "honeypot", help: "Make a channel nobody should post in. Leave empty to turn this off." },
      {
        key: "automod.honeypot.action",
        type: "select",
        label: "Then",
        required: true,
        group: "honeypot",
        showIf: "automod.honeypot.channel",
        options: [{ value: "ban", label: "Ban them" }, { value: "kick", label: "Kick them" }, { value: "shadowban", label: "Shadowban them" }],
      },
      { key: "automod.honeypot.cleanup", type: "toggle", label: "Also delete their messages from the past hour", group: "honeypot", showIf: [{ key: "automod.honeypot.action", in: ["ban", "kick"] }, "automod.honeypot.channel"], help: "Kicks become a quick ban and unban to do this." },
      { key: "automod.honeypot.warning", type: "textarea", max: 2000, label: "Warning message", group: "honeypot", showIf: "automod.honeypot.channel", help: "Posted in the channel with the button below. Leave empty for the default warning." },
      ...filterFields("spam", [
        { key: "maxMessages", type: "number", min: 2, max: 30, label: "More than this many messages" },
        { key: "seconds", type: "number", min: 1, max: 30, label: "Within (seconds)" },
      ]),
      ...filterFields("duplicates", [
        { key: "count", type: "number", min: 2, max: 20, label: "Same message this many times" },
      ]),
      ...filterFields("invites", [
        { key: "allowOwnServer", type: "toggle", label: "Allow invites to this server" },
      ]),
      ...filterFields("links", [
        { key: "allowedDomains", type: "strings", max: 100, itemMax: 100, lowercase: true, placeholder: "e.g. youtube.com", label: "Allowed sites", help: "Subdomains are allowed too: youtube.com also allows m.youtube.com." },
      ]),
      ...filterFields("mentions", [
        { key: "max", type: "number", min: 1, max: 50, label: "More than this many mentions" },
      ]),
      ...filterFields("caps", [
        { key: "percent", type: "number", min: 50, max: 100, label: "At least this % capitals" },
        { key: "minLength", type: "number", min: 1, max: 200, label: "In messages with at least this many letters" },
      ]),
      ...filterFields("words", [
        { key: "words", type: "strings", max: 500, itemMax: 100, placeholder: "Add a word or phrase", label: "Blocked words", help: "Whole words only. Add * to match inside words too: *scam* also catches “scammer”." },
      ]),
      ...filterFields("emojis", [
        { key: "max", type: "number", min: 1, max: 100, label: "More than this many emojis" },
      ]),
      ...filterFields("lines", [
        { key: "max", type: "number", min: 2, max: 200, label: "More than this many lines" },
      ]),
    ],
  },
  {
    id: "discord-automod",
    name: "Discord AutoMod",
    description: "Punish people who break your Discord AutoMod rules (Server Settings → AutoMod). Discord blocks the message; Phoenix adds the warning, mute, kick or ban. Moderators and the roles and channels ignored on the Automod page are left alone.",
    fields: [
      {
        key: "automod.discordRules",
        type: "list",
        label: "Linked rules",
        help: "Phoenix needs the Manage Server permission to see AutoMod rules and when they're broken.",
        max: 25,
        uniqueBy: "ruleId",
        fields: [
          { key: "ruleId", type: "automodRule", label: "AutoMod rule", required: true },
          { key: "action", type: "select", label: "Then", required: true, options: PUNISHMENTS },
          { key: "duration", type: "duration", label: "For", min: 0, max: 365 * 86_400_000, showIf: { key: "action", in: ["mute", "ban"] }, help: "0 = permanent." },
        ],
      },
    ],
  },
  {
    id: "welcome",
    name: "Welcome & goodbye",
    description: "Messages for people joining and leaving.",
    placeholders: true,
    fields: [
      { key: "welcomer.channel", type: "channel", channelTypes: TEXT_CHANNELS, label: "Welcome channel" },
      { key: "welcomer.message", type: "textarea", max: 2000, label: "Welcome message", preview: true },
      { key: "welcomer.dmtext", type: "textarea", max: 2000, label: "Welcome DM", preview: true, help: "Sent privately to new members. Leave empty to not send one." },
      { key: "goodbyes.channel", type: "channel", channelTypes: TEXT_CHANNELS, label: "Goodbye channel" },
      { key: "goodbyes.message", type: "textarea", max: 2000, label: "Goodbye message", preview: true },
    ],
  },
  {
    id: "verification",
    name: "Verification",
    description: "Members press a button and type a code to get access to the server.",
    placeholders: true,
    fields: [
      { key: "verification.role", type: "role", assignable: true, label: "Verified role", help: "Given to members once they verify." },
      { key: "verification.unverifiedRole", type: "role", assignable: true, label: "Unverified role", help: "Optional. Removed once they verify." },
      { key: "verification.managerRole", type: "role", label: "Verification managers", help: "Can verify members by hand with the verify command." },
      { key: "verification.messageText", type: "textarea", max: 2000, label: "Verification panel text", help: "Shown above the Verify button when you post the panel below." },
      { key: "verification.verifiedText", type: "textarea", max: 1000, label: "Message after verifying", preview: true },
    ],
  },
  {
    id: "starboard",
    name: "Starboard",
    description: "Repost messages that get enough reactions.",
    fields: [
      { key: "starboard.channel", type: "channel", channelTypes: TEXT_CHANNELS, label: "Starboard channel" },
      { key: "starboard.emoji", type: "emoji", label: "Reaction", help: "A normal emoji like ⭐ or a custom one like <:star:123456789012345678>." },
      { key: "starboard.threshold", type: "number", min: 1, max: 1000, label: "Reactions needed", storeAs: "string" },
      { key: "starboard.selfstar", type: "toggle", label: "Let people star their own messages" },
    ],
  },
  {
    id: "leveling",
    name: "Leveling",
    description: "Members earn XP for chatting and level up.",
    placeholders: true,
    fields: [
      { key: "leveling.enable", type: "toggle", label: "Leveling" },
      { key: "leveling.publicLeaderboard", type: "toggle", label: "Public leaderboard", help: "While leveling is on, anyone with the link can see the top 100 on the website, and the leaderboard command links there." },
      { key: "leveling.message", type: "textarea", max: 2000, label: "Level up message", preview: true, help: "Use {{level}} for the new level. Leave empty to not announce level ups." },
      { key: "leveling.announceChannel", type: "channel", channelTypes: TEXT_CHANNELS, label: "Announce level ups in", help: "Leave empty to announce in the channel where they leveled up." },
      { key: "leveling.rates.minimum", type: "number", min: 1, max: 1000, label: "Least XP per message" },
      { key: "leveling.rates.maximum", type: "number", min: 1, max: 1000, label: "Most XP per message" },
      {
        key: "leveling.levelRoles",
        type: "list",
        label: "Level rewards",
        help: "Roles given when members reach a level.",
        max: 50,
        uniqueBy: "level",
        fields: [
          { key: "level", type: "number", min: 1, max: 10_000, label: "Level", required: true, storeAs: "string" },
          { key: "roleId", type: "role", assignable: true, label: "Role", required: true },
        ],
      },
      { key: "leveling.stackRoles", type: "toggle", label: "Keep earlier rewards", help: "When off, members only keep their highest reward role." },
      { key: "leveling.blacklistRole", type: "roles", label: "Roles that don't earn XP" },
      { key: "leveling.blacklistChannels", type: "channels", channelTypes: LOGGABLE_CHANNELS, label: "Channels that don't earn XP" },
      {
        key: "leveling.multipliers",
        type: "list",
        label: "XP multipliers",
        help: "Members with these roles earn more (or less) XP per message. If someone has several, the biggest multiplier counts. 0 stops them earning XP.",
        max: 25,
        uniqueBy: "roleId",
        fields: [
          { key: "roleId", type: "role", label: "Role", required: true },
          { key: "multiplier", type: "number", decimal: true, step: 0.1, min: 0, max: 10, label: "Multiplier (×)", required: true, default: 2 },
        ],
      },
      { key: "leveling.useEmbed", type: "toggle", label: "Show levels as text instead of a rank card" },
      { key: "leveling.backgroundTransparency", type: "number", min: 0, max: 100, label: "Rank card overlay (%)", help: "How dark the overlay on your rank card background is." },
    ],
  },
  {
    id: "tags",
    name: "Tags",
    description: "Saved replies anyone can show with the tag command. Tags can have an embed attached.",
    placeholders: true,
    fields: [
      { key: "lockTags", type: "toggle", label: "Only managers can add and remove tags" },
    ],
  },
  {
    id: "afk",
    name: "AFK",
    description: "When someone mentions a member who set an AFK status (with /userdb afk), Phoenix lets them know.",
    placeholders: true,
    fields: [
      { key: "afk.enabled", type: "toggle", label: "Tell people when someone is AFK" },
      { key: "afk.message", type: "textarea", max: 2000, label: "AFK message", preview: true, showIf: "afk.enabled", help: "Placeholders are about the AFK member. {{afkreason}} is their reason and {{afksince}} is how long ago they left. Leave empty for the default." },
      { key: "afk.embed", type: "embed", label: "AFK embed", showIf: "afk.enabled", help: "Optional. Placeholders work in the embed too." },
      { key: "afk.welcomeBack", type: "toggle", label: "Welcome people back", help: "When an AFK member talks again, their status is cleared either way. This says so." },
      { key: "afk.welcomeBackMessage", type: "textarea", max: 2000, label: "Welcome back message", preview: true, showIf: "afk.welcomeBack", help: "Leave empty for the default." },
    ],
  },
  {
    id: "autoresponses",
    name: "Autoresponses",
    description: "Phoenix replies when a message matches a trigger. Each one waits 15 seconds before it can fire again in the same channel.",
    placeholders: true,
    fields: [
      {
        key: "autoresponses",
        type: "list",
        label: "Autoresponses",
        help: "The first one that matches replies. Servers can have 25, or 100 with Phoenix Plus.",
        limit: "autoresponses",
        addLabel: "Add autoresponse",
        fields: [
          { key: "trigger", type: "text", label: "Trigger", required: true, min: 1, max: 200 },
          {
            key: "match",
            type: "select",
            label: "Matches when the message",
            required: true,
            default: "contains",
            options: [
              { value: "contains", label: "contains it" },
              { value: "word", label: "contains it as a word" },
              { value: "exact", label: "is exactly it" },
              { value: "startsWith", label: "starts with it" },
              { value: "regex", label: "matches it as a regex" },
            ],
          },
          { key: "matchCase", type: "toggle", label: "Match capitals", default: false },
          { key: "reply", type: "toggle", label: "Reply to the message", default: true },
          { key: "enabled", type: "toggle", label: "On", default: true },
          { key: "content", type: "textarea", label: "Reply", max: 2000, wide: true },
          { key: "embed", type: "embed", label: "Embed" },
          { key: "channels", type: "channels", channelTypes: LOGGABLE_CHANNELS, label: "Only in these channels", wide: true },
        ],
      },
    ],
  },
  {
    id: "timed",
    name: "Timed messages",
    description: "Messages Phoenix posts in a channel every so often, like reminders or rules.",
    placeholders: true,
    fields: [
      {
        key: "timedMessages",
        type: "list",
        label: "Timed messages",
        help: "The first one goes out about a minute after you save, then on schedule. Servers can have 5, or 25 with Phoenix Plus.",
        limit: "timedMessages",
        addLabel: "Add timed message",
        fields: [
          { key: "channel", type: "channel", channelTypes: TEXT_CHANNELS, label: "Channel", required: true },
          { key: "interval", type: "duration", label: "Every", min: 5 * 60_000, minNonZero: 5 * 60_000, max: 30 * 86_400_000, units: ["minute", "hour", "day"], required: true, default: 3_600_000 },
          { key: "onlyWhenActive", type: "toggle", label: "Only if people talked since the last one", default: false },
          { key: "enabled", type: "toggle", label: "On", default: true },
          { key: "content", type: "textarea", label: "Message", max: 2000, wide: true },
          { key: "embed", type: "embed", label: "Embed" },
        ],
      },
    ],
  },
  {
    id: "sticky",
    name: "Sticky messages",
    description: "Keeps a message at the bottom of a channel. When people talk, Phoenix deletes its old copy and posts it again.",
    placeholders: true,
    fields: [
      {
        key: "stickyMessages",
        type: "list",
        label: "Sticky messages",
        help: "One per channel. Servers can have 5, or 25 with Phoenix Plus.",
        limit: "stickyMessages",
        uniqueBy: "channel",
        addLabel: "Add sticky message",
        fields: [
          { key: "channel", type: "channel", channelTypes: TEXT_CHANNELS, label: "Channel", required: true },
          { key: "cooldown", type: "duration", label: "Repost at most every", min: 5_000, minNonZero: 5_000, max: 10 * 60_000, units: ["second", "minute"], default: 15_000, help: "Keeps busy chats from causing a repost for every message." },
          { key: "enabled", type: "toggle", label: "On", default: true },
          { key: "content", type: "textarea", label: "Message", max: 2000, wide: true },
          { key: "embed", type: "embed", label: "Embed" },
        ],
      },
    ],
  },
];

const fieldsByKey = new Map();
for (const section of sections) for (const field of section.fields) fieldsByKey.set(field.key, { section: section.id, field });

module.exports = { sections, fieldsByKey, TEXT_CHANNELS };
