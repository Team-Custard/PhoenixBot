const { Listener } = require("@sapphire/framework");
const {
  messageLink,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const UserDB = require("../../tools/UserDB");

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "interactionCreate",
    });
  }
  async run(interaction) {
    // Global user commands must be used here for the time being.
    // console.log(interaction);
    if (
      interaction.isMessageContextMenuCommand() &&
      interaction.commandName == "Translate message"
    ) {
      try {
        // console.log(interaction.targetMessage);
        const db = await UserDB.findById(interaction.user.id);

        await interaction.deferReply({ ephemeral: db ? db.ephemeral : false });

        const message = interaction.targetMessage;

        const translate = require("translate");
        const detect = require("text-language-detector");
        const detected = await detect(message.content);

        translate.engine = "google";
        translate.key = process.env.googlekey;

        let msgLink;
        if (message.guildId) {
          msgLink = await messageLink(
            message.channelId,
            message.id,
            message.guildId,
          );
        } else {
          msgLink = await messageLink(message.channelId, message.id);
        }

        const buttons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId("userbotinfo")
              .setLabel("Why am I seeing this")
              .setEmoji("❔")
              .setStyle(ButtonStyle.Secondary),
          )
          .addComponents(
            new ButtonBuilder()
              .setCustomId("userbotephemeral-" + interaction.user.id)
              .setLabel("Toggle ephemeral")
              .setStyle(ButtonStyle.Secondary),
          );

        const text = await translate(message.content, {
          from: detected.match_language_data.code2,
          to: interaction.locale.substring(0, 2),
        });
        interaction.followUp({
          content: `[${message.author.tag} said:](<${msgLink}>) ${text}`,
          allowedMentions: { parse: [] },
          components: [buttons],
        });
      } catch (err) {
        console.error(err);
      }
    }

    if (
      interaction.isUserContextMenuCommand() &&
      interaction.commandName == "Time for user"
    ) {
      try {
        const db = await UserDB.findById(interaction.user.id);

        await interaction.deferReply({ ephemeral: db ? db.ephemeral : false });

        const member = interaction.targetUser;

        const usersettings = await UserDB.findById(
          member.id,
          UserDB.upsert,
        ).cacheQuery();
        if (!usersettings) {
          return interaction.followUp(
            `:x: **${member.username}** does not have a timezone set.`,
          );
        }
        if (!usersettings.timezone) {
          return interaction.followUp(
            `:x: **${member.username}** does not have a timezone set.`,
          );
        }

        const date = new Date();
        const strTime = date.toLocaleTimeString("en-US", {
          timeZone: usersettings.timezone,
        });
        const strDate = date.toLocaleDateString("en-US", {
          timeZone: usersettings.timezone,
        });

        const buttons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId("userbotinfo")
              .setLabel("Why am I seeing this")
              .setEmoji("❔")
              .setStyle(ButtonStyle.Secondary),
          )
          .addComponents(
            new ButtonBuilder()
              .setCustomId("userbotephemeral-" + interaction.user.id)
              .setLabel("Toggle ephemeral")
              .setStyle(ButtonStyle.Secondary),
          );

        await interaction.followUp({
          content: `**${member.username}**'s time is **${strTime}** (${strDate}).`,
          components: [buttons],
        });
      } catch (err) {
        console.error(err);
      }
    }

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == "setup_userdb"
    ) {
      try {
        const { modal } = require("../../commands/interaction-specific/userdb");
        interaction.showModal(modal);
      } catch (err) {
        console.error(err);
      }
    }
  }
}
module.exports = {
  ReadyListener,
};
