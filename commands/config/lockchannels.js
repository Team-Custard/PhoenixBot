const { Command } = require("@sapphire/framework");
const {
  Colors,
  PermissionFlagsBits,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "lockchannels",
      aliases: ["lockdownchannels"],
      description:
        "Configures which channels the bot will lock with the lock --all command.",
      detailedDescription: {
        usage: "lockall",
        examples: ["lockall"],
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
      new ChannelSelectMenuBuilder()
        .setCustomId("lockdownChannels")
        .addDefaultChannels(db.moderation.lockdownChannels)
        .setChannelTypes([
          ChannelType.GuildAnnouncement,
          ChannelType.GuildDirectory,
          ChannelType.GuildCategory,
          ChannelType.GuildForum,
          ChannelType.GuildMedia,
          ChannelType.GuildStageVoice,
          ChannelType.GuildVoice,
          ChannelType.GuildText,
        ])
        .setPlaceholder("Select channels to lock")
        .setMaxValues(25),
    );

    const msg = await message.reply({
      content: `Select the channels you want to set as lockdown channels. Channels in this list will be locked when a lockall is triggered.`,
      components: [actionRow],
    });
    const filter = (interaction) =>
      interaction.customId === "lockdownChannels" &&
      interaction.user.id === message.author.id;
    await msg
      .awaitMessageComponent({ filter, time: 30_000 })
      .then(async function (interaction) {
        interaction.deferUpdate();
        const channels = interaction.channels.map((c) => c.id);
        db.moderation.lockdownChannels = channels;
        await db.save();
        const actionRowT = new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId("lockdownChannels")
            .addDefaultChannels(channels)
            .setChannelTypes([
              ChannelType.GuildAnnouncement,
              ChannelType.GuildDirectory,
              ChannelType.GuildForum,
              ChannelType.GuildMedia,
              ChannelType.GuildStageVoice,
              ChannelType.GuildVoice,
              ChannelType.GuildText,
            ])
            .setPlaceholder("Select channels to lock")
            .setMaxValues(25)
            .setDisabled(true),
        );
        await msg.edit({
          content: `:white_check_mark: Lockdown channels set successfully.`,
          components: [actionRowT],
        });
      })
      .catch(async function () {
        const actionRowT = new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId("lockdownChannels")
            .addDefaultChannels(db.moderation.lockdownChannels)
            .setPlaceholder("Select channels to lock")
            .setMaxValues(25)
            .setDisabled(true),
        );
        await msg.edit({
          content: `:x: This prompt has failed or timed out.`,
          components: [actionRowT],
        });
      });
  }
}
module.exports = {
  PingCommand,
};
