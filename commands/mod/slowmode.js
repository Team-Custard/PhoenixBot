const { PermissionFlagsBits, ChannelType } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { formatDuration } = require("../../tools/moderation");

const MAX_SLOWMODE = 6 * 60 * 60 * 1000;

class SlowmodeCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "slowmode",
      aliases: ["sm", "cooldown"],
      description: "Changes the slowmode of a channel (up to 6 hours). Use 0 to turn it off.",
      examples: ["slowmode 10s", "slowmode 0 #general"],
      args: [
        { name: "time", type: "string", required: true, description: "The cooldown, e.g. 10s, 5m or 0 to disable" },
        {
          name: "channel",
          type: "channel",
          description: "The channel to change (defaults to this one)",
          channelTypes: [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum, ChannelType.GuildStageVoice, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildMedia],
        },
      ],
      slash: { group: "mod" },
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ModerateMembers],
      requiredClientPermissions: [PermissionFlagsBits.ManageChannels],
      preconditions: ["module"],
    });
  }

  async run(ctx, { time, channel }) {
    const target = channel ?? ctx.channel;
    const slowmode = time === "0" || time === "off" ? 0 : require("ms")(time);
    if (typeof slowmode !== "number" || slowmode < 0 || slowmode > MAX_SLOWMODE) {
      return ctx.reply(`${emoji("error")} Invalid slowmode time.`);
    }

    await target.setRateLimitPerUser(Math.round(slowmode / 1000), `(Slowmode changed by ${ctx.user.tag})`);
    return ctx.reply(
      slowmode > 0
        ? `${emoji("success")} Slowmode of ${target} is now **${await formatDuration(slowmode)}**.`
        : `${emoji("success")} Slowmode of ${target} has been disabled.`,
    );
  }
}

module.exports = { SlowmodeCommand };
