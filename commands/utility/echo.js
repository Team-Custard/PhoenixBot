const { PermissionFlagsBits, ChannelType } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const { parse } = require("../../tools/textParser");

class EchoCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "echo",
      aliases: ["say"],
      description: "Makes the bot say a message. Requires a command log channel.",
      examples: ["echo Hello there."],
      args: [
        { name: "text", type: "string", required: true, rest: true, maxLength: 2000, description: "Text to say" },
        {
          name: "channel",
          type: "channel",
          prefix: false,
          description: "The channel to send the message in",
          channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.PublicThread, ChannelType.PrivateThread],
        },
      ],
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"],
    });
  }

  async run(ctx, { text, channel }) {
    const settings = await getSettings(ctx.guild.id);
    // Without a command log nobody could tell who made the bot say something.
    if (!settings.logging?.commands) {
      return ctx.error(`${emoji("error")} In order to use the echo command, you must set a command logging channel first (on the dashboard) so you'd know who is talking through the bot.`);
    }
    const target = channel ?? ctx.channel;
    await target.send(await parse(text, ctx.member));
    if (ctx.isSlash) return ctx.reply({ content: `${emoji("success")} Successfully sent the message.`, ephemeral: true });
    return undefined;
  }
}

module.exports = { EchoCommand };
