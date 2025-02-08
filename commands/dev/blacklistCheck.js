const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");


class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "blacklistcheck",
      aliases: ["blcheck"],
      description:
        "Checks if a server is blacklisted.",
      detailedDescription: {
        usage: "blacklistcheck <guild_id>",
        examples: ["blacklistcheck 1251025316701405284 Scamming via welcome dms"],
        args: ["guild: The guild to blacklist"]
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["botModCommand"],
    });
  }

  async messageRun(message, args) {
    const guild = await args.pick("string");

    const db = await serverSettings.findById(
        guild,
        serverSettings.upsert,
      ).cacheQuery();
    if (!db) return message.reply(`Invalid server specified.`)

    if (!db.blacklisted) return message.reply(`The specified server is not blacklisted.`);
    await message.reply(`The specified server is blacklisted. The reason specified was:\`\`\`${db.blacklistReason}\`\`\``);
  }
}
module.exports = {
  PingCommand,
};
