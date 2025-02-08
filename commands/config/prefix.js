const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "prefix",
      aliases: [],
      description: "Sets the bot's prefix",
      detailedDescription: {
        usage: "prefix",
        examples: ["prefix ="],
        args: ["prefix : The prefix to use"],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
    });
  }

  async messageRun(message, args) {
    const newprefix = await args.pick("string").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (newprefix) {
      if (newprefix > 6) {
        return message.reply(`${this.container.emojis.error} Prefix can be no more than 6 characters.`);
      }
      if (newprefix < 1) {
        return message.reply(`${this.container.emojis.error} Prefix can be no less than 0 characters.`);
      }
      db.prefix = newprefix;

      db.save()
        .then(() => {
          message.reply(
            `${this.container.emojis.success} Prefix is now set to **${newprefix}**.`,
          );
        })
        .catch((err) => {
          message.reply(`${this.container.emojis.error} ${err}`);
        });
    } else {
      message.reply(`The current prefix is **${db.prefix}**`);
    }
  }
}
module.exports = {
  PingCommand,
};
