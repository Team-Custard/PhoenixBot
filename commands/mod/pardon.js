const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "pardon",
      aliases: [`pd`, `removewarn`, `excuse`],
      description: "Marks a warning as pardoned, making the warning inactive early. Inactive warnings don't count towards the punishment system.",
      detailedDescription: {
        usage: "pardon <caseid>",
        examples: ["pardon 22"],
        args: ["caseid : The case to remove"],
      },
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  async chatInputRun(interaction) {
    const caseid = interaction.options.getInteger('case_id');
    await interaction.deferReply()

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const thecase = db.infractions.find((c) => c.id == caseid);
    if (!thecase) return interaction.followUp(`${this.container.emojis.error} No such case found.`);
    if (thecase.punishment != "Warn") return interaction.followUp(`${this.container.emojis.error} Sorry, this case is not a warning or was already pardoned.`);

    for (let i = 0; i < db.infractions.length; i++) {
      if (db.infractions[i].id == caseid) {
        db.infractions[i].punishment = db.infractions[i].punishment + " (pardoned)"
        db.infractions[i].expired = true
      }
    }

    await db.save();
    interaction.followUp(
      `${this.container.emojis.success} **${this.container.client.users.cache.get(thecase.member) ? this.container.client.users.cache.get(thecase.member).tag : thecase.member}**'s warning has been pardoned.`,
    );

    if (db.logging.infractions) {
      const channel = await interaction.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);

      if (channel) {
        const message = await channel.messages.fetch(thecase.modlogID).catch(() => undefined);
        if (!message) return;
        const embed = new EmbedBuilder(message.embeds[0])
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`);

        await channel.messages
          .fetch(thecase.modlogID)
          .then(function (msg) {
            console.log(thecase.modlogID);
            msg.edit({ embeds: [embed] });
          })
          .catch(function (err) {
            console.error(`[error] Error on sending to channel`, err);
          });
      }
    }
  }
  
  async messageRun(message, args) {
    const caseid = await args.pick("number");

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const thecase = db.infractions.find((c) => c.id == caseid);
    if (!thecase) return message.reply(`${this.container.emojis.error} No such case found.`);
    if (thecase.punishment != "Warn") return message.reply(`${this.container.emojis.error} Sorry, this case is not a warning or was already pardoned.`);

    for (let i = 0; i < db.infractions.length; i++) {
      if (db.infractions[i].id == caseid) {
        db.infractions[i].punishment = db.infractions[i].punishment + " (pardoned)"
        db.infractions[i].expired = true
      }
    }

    await db.save();
    message.reply(
      `${this.container.emojis.success} **${this.container.client.users.cache.get(thecase.member) ? this.container.client.users.cache.get(thecase.member).tag : thecase.member}**'s warning has been pardoned.`,
    );

    if (db.logging.infractions) {
      const channel = await message.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);

      if (channel) {
        const message = await channel.messages.fetch(thecase.modlogID).catch(() => undefined);
        if (!message) return;
        const embed = new EmbedBuilder(message.embeds[0])
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`);

        await channel.messages
          .fetch(thecase.modlogID)
          .then(function (msg) {
            console.log(thecase.modlogID);
            msg.edit({ embeds: [embed] });
          })
          .catch(function (err) {
            console.error(`[error] Error on sending to channel`, err);
          });
      }
    }
  }
}
module.exports = {
  PingCommand,
};
