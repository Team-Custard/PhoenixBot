// Argument definitions shared by several commands (see PhoenixCommand for the format).

const silent = {
  name: "silent",
  type: "boolean",
  aliases: ["s"],
  description: "Don't DM the member about this action",
};

const hidden = {
  name: "hidden",
  type: "boolean",
  aliases: ["hide", "h"],
  description: "Don't show who the moderator was in the member's DM",
};

const reason = (description = "The reason for the action") => ({
  name: "reason",
  type: "string",
  rest: true,
  description,
  maxLength: 1000,
});

const duration = (description = "How long it should last, e.g. 10m, 2h, 7d") => ({
  name: "duration",
  type: "duration",
  description,
});

/** Standard cooldown for moderation actions: 20 uses per 30 minutes. */
const modCooldown = { cooldownDelay: 1_800_000, cooldownLimit: 20 };

module.exports = { silent, hidden, reason, duration, modCooldown };
