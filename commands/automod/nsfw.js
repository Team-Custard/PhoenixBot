const { Command } = require("@sapphire/framework");
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
      name: "nsfw",
      aliases: [],
      description:
        "Configures what to do when a member sends an image identified as nsfw.",
      detailedDescription: {
        usage: "nsfw",
        examples: ["nsfw"],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
    });
  }

  async messageRun(message) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const actionRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("automodSetting")
        .setPlaceholder("Choose an action")
        .setOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Delete message")
            .setValue("delete"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Send message")
            .setValue("send"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Report to mods")
            .setValue("report"),
          new StringSelectMenuOptionBuilder().setLabel("Warn").setValue("warn"),
          new StringSelectMenuOptionBuilder().setLabel("Mute").setValue("mute"),
          new StringSelectMenuOptionBuilder().setLabel("Kick").setValue("kick"),
          new StringSelectMenuOptionBuilder().setLabel("Ban").setValue("ban"),
        )
        .setMinValues(0)
        .setMaxValues(7),
    );
    actionRow.components[0].options.forEach((o) =>
      o.setDefault(db.automod.nsfwimage.includes(o.data.value)),
    );
    const msg = await message.reply({
      content: `Select what the automod will do if someone sends an image identified as nsfw.`,
      components: [actionRow],
    });
    const filter = (interaction) =>
      interaction.customId === "automodSetting" &&
      interaction.user.id === message.author.id;
    await msg
      .awaitMessageComponent({ filter, time: 30_000 })
      .then(async function (interaction) {
        interaction.deferUpdate();
        db.automod.nsfwimage = interaction.values;
        const comp = actionRow;
        comp.components[0].setDisabled(true);
        comp.components[0].options.forEach((o) =>
          o.setDefault(db.automod.nsfwimage.includes(o.data.value)),
        );
        await db.save();
        await msg.edit({
          content: `:white_check_mark: Automod setting set successfully.`,
          components: [comp],
        });
      })
      .catch(async function (err) {
        const comp = actionRow;
        comp.components[0].setDisabled(true);
        comp.components[0].options.forEach((o) =>
          o.setDefault(db.automod.nsfwimage.includes(o.data.value)),
        );
        await msg.edit({
          content: `:x: This prompt has failed or timed out.`,
          components: [comp],
        });
      });
  }
}
module.exports = {
  PingCommand,
};
