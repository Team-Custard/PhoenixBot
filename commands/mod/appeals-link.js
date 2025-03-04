const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const { weirdToNormalChars } = require('weird-to-normal-chars');
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "appeals-link",
      aliases: [`appeal`, "appeallink"],
      description: "Add an appeal button to your ban dm",
      detailedDescription: {
        usage: "appeal-link <link>",
        examples: ["appeal-link https://appeal.gg/sylveondev"],
        args: ["link : The ban appeal link. We recommend using [this site](https://appeal.gg) for appeals"],
      },
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  async messageRun(interaction) {
    await interaction.deferReply();
    const link = await interaction.options.getString('link');

    const db = await serverSettings
        .findById(interaction.guild.id, serverSettings.upsert)
        .cacheQuery();

    if (!link) {
        db.moderation.appealLink = null;
        await db.save();
        interaction.followUp(
            `${this.container.emojis.success} Ban appeal link removed successfully.`,
          );
    }

    if (!link.startsWith('https://')) return interaction.followUp(`${this.container.emojis.error} That wasn't a link.`)

    

    db.moderation.appealLink = link;

    await db.save();
    interaction.followUp(
      `${this.container.emojis.success} Ban appeal link set to \`${link}\`.`,
    );
  }
  
  async messageRun(message, args) {
    const link = await args.pick("string").catch(() => undefined);

    const db = await serverSettings
        .findById(message.guild.id, serverSettings.upsert)
        .cacheQuery();

    if (!link) {
        db.moderation.appealLink = null;
        await db.save();
        message.reply(
            `${this.container.emojis.success} Ban appeal link removed successfully.`,
          );
    }

    if (!link.startsWith('https://')) return message.reply(`${this.container.emojis.error} That wasn't a link.`)

    

    db.moderation.appealLink = link;

    await db.save();
    message.reply(
      `${this.container.emojis.success} Ban appeal link set to \`${link}\`.`,
    );
  }
}
module.exports = {
  PingCommand,
};
