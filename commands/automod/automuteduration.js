const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "automuteduration",
      aliases: ["automute"],
      description:
        "Sets the default duration a member gets muted for if they trigger automod.",
      detailedDescription: {
        usage: "automuteduration <duration>",
        examples: ["automuteduration 24h", "automuteduration 1d"],
        args: ["duration : The duration no more than 28 days"],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    const durationString = await args.pick("string");

    const duration = await require("pretty-ms")(durationString, {verbose: true});
    if (isNaN(duration))
      return message.reply(`${this.container.emojis.error} The mute duration is invalid.`);
    if (duration > 40320 * 60 * 1000)
      return message.reply(`${this.container.emojis.error} Mute duration can be no more than 28 days.`);
    if (duration < 1000)
      return message.reply(`${this.container.emojis.error} Mute duration can be no less than 1 second.`);

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (durationString) {
      db.automod.muteduration = duration;

      db.save()
        .then(() => {
          message.reply(
            `${this.container.emojis.success} Mute duration is now ${require("ms")(duration, { long: true })}.`,
          );
        })
        .catch((err) => {
          message.reply(`${this.container.emojis.error} ${err}`);
        });
    } else {
      db.automod.reportchannel = "";
      db.automod.pingreport = "";

      db.save()
        .then(() => {
          message.reply(
            `${this.container.emojis.success} Automod reports channel was cleared.`,
          );
        })
        .catch((err) => {
          message.reply(`${this.container.emojis.error} ${err}`);
        });
    }
  }
}
module.exports = {
  PingCommand,
};
