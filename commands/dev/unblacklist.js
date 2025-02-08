const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");


class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "unblacklist",
      aliases: ["unbotban"],
      description:
        "Reverses a blacklist on a guild.",
      detailedDescription: {
        usage: "unblacklist <guild_id> <reason>",
        examples: ["unblacklist 1251025316701405284 Resolved"],
        args: ["guild: The guild to blacklist"]
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["botModCommand"],
    });
  }

  async messageRun(message, args) {
    const guild = await args.pick("string");
    const reason = await args.rest("string");

    const db = await serverSettings.findById(
        guild,
        serverSettings.upsert,
      ).cacheQuery();

    db.blacklisted = false;
    db.blacklistReason = null;

    await db.save();
    await message.reply(`***Guild is no longer blacklisted.***`);

    const logChannel = await this.container.client.channels.fetch('1337678910380310558');
    if (logChannel) {
      logChannel.send({
        content: `Guild \`${guild}\` was unblacklisted. Reason: ${reason}`
      });
    }
  }
}
module.exports = {
  PingCommand,
};
