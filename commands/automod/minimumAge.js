const { Command, container } = require("@sapphire/framework");
const {
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "minimumage",
      aliases: [],
      description:
        "Configures how old members must be to join the server.",
      detailedDescription: {
        usage: "minimumage [days]",
        examples: ["minimumage 7", "minimumage 3"],
        flags: [`days : The minimum age a member's account must be to join the server`]
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    const days = await args.pick("number");

    const theTime = days * 86400000;

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (theTime == 0) {
      db.automod.minimumAge = 0;
      await db.save();
      return await message.reply(`${this.container.emojis.success} Minimum age has been disabled.`);
    }

    if (theTime < 0) {
      return await message.reply(`${this.container.emojis.error} The time must be greater than zero days.`);
    }

    db.automod.minimumAge = theTime;
    await db.save();
    return await message.reply({ content: `${this.container.emojis.success} Minimum age has been enabled. Users that join will need to be at least ${days} days old to avoid getting kicked.`, allowedMentions: { parse: [] } });
  }
}
module.exports = {
  PingCommand,
};
