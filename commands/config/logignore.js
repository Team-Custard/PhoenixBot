const { Command, container } = require("@sapphire/framework");
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
      name: "logignore",
      aliases: ["msglogignore"],
      description:
        "Configures which channels the message log will ignore.",
      detailedDescription: {
        usage: "logignore",
        examples: ["logignore"],
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
        .setCustomId("ignoreChannels")
        .addDefaultChannels(db.logging.msgignorechannels)
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
        .setPlaceholder("Select channels to ignore")
        .setMaxValues(25),
    );

    const msg = await message.reply({
      content: `Select the channels you want the message log to ignore. Channels in this list will not log message events.`,
      components: [actionRow],
    });
    const filter = (interaction) =>
      interaction.customId === "ignoreChannels" &&
      interaction.user.id === message.author.id;
    await msg
      .awaitMessageComponent({ filter, time: 30_000 })
      .then(async function (interaction) {
        interaction.deferUpdate();
        const channels = interaction.channels.map((c) => c.id);
        db.logging.msgignorechannels = channels;
        await db.save();
        const actionRowT = new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId("ignoreChannels")
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
            .setPlaceholder("Select channels to ignore")
            .setMaxValues(25)
            .setDisabled(true),
        );
        await msg.edit({
          content: `${container.emojis.success} Ignore channels set successfully.`,
          components: [actionRowT],
        });
      })
      .catch(async function () {
        const actionRowT = new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId("ignoreChannels")
            .addDefaultChannels(db.logging.msgignorechannels)
            .setPlaceholder("Select channels to ignore")
            .setMaxValues(25)
            .setDisabled(true),
        );
        await msg.edit({
          content: `${container.emojis.error} This prompt has failed or timed out.`,
          components: [actionRowT],
        });
      });
  }
}
module.exports = {
  PingCommand,
};
