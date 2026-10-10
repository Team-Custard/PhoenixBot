const { PermissionFlagsBits, ChannelType } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

const ANNOUNCEMENT_CHANNEL = "1251238477484396575";

class UpdatesCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "updates",
      aliases: ["subscribe"],
      description: "Follows the Phoenix update log and announcements in one of your channels.",
      examples: ["updates #bot-news"],
      args: [{
        name: "channel",
        type: "channel",
        required: true,
        channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
        description: "The channel that should receive announcements",
      }],
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageWebhooks],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"],
    });
  }

  async run(ctx, { channel }) {
    await ctx.defer();
    const news = await this.container.client.channels.fetch(ANNOUNCEMENT_CHANNEL);
    await news.addFollower(channel, `(${ctx.user.username}) Subscribing to bot announcements.`);
    return ctx.reply(`${emoji("success")} Phoenix announcements are now being sent to ${channel}.`);
  }
}

module.exports = { UpdatesCommand };
