const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, Colors, EmbedBuilder } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");


class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "blacklist",
      aliases: ["botban"],
      description:
        "Blacklists a guild from using Phoenix. Guilds can only be blacklisted if the bot is currently in the server to prevent abuse of the system.",
      detailedDescription: {
        usage: "blacklist <guild_id> <reason>",
        examples: ["blacklist 1251025316701405284 Scamming via welcome dms"],
        args: ["guild: The guild to blacklist", "reason: The reason for the blacklist"]
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["botModCommand"],
    });
  }

  async messageRun(message, args) {
    const guild = await args.pick("guild");
    const reason = await args.rest("string");

    const db = await serverSettings.findById(
        guild.id,
        serverSettings.upsert,
      ).cacheQuery();

    db.blacklisted = true;
    db.blacklistReason = `(${message.author.tag}) ${reason}`;

    await db.save();
    await guild.leave();
    await message.reply(`***\`${guild.id}\` was blacklisted.***`);

    const logChannel = await this.container.client.channels.fetch('1337678910380310558');
    if (logChannel) {
      logChannel.send({
        content: `Guild ${guild.name} (\`${guild.id}\`) was blacklisted. Reason: ${reason}`
      });
    }
  }
}
module.exports = {
  PingCommand,
};
