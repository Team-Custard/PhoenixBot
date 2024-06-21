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
    console.log(interaction);
    if (
      interaction.isMessageContextMenuCommand() &&
      interaction.commandName == "Translate message"
    ) {
      // console.log(interaction.targetMessage);
      const db = await UserDB.findById(interaction.user.id);

      await interaction.deferReply({ ephemeral: db ? db.ephemeral : false });

      const message = interaction.targetMessage;

      const detectLang = new (require("languagedetect"))();
      detectLang.setLanguageType("iso2");
      const sourceLang = await detectLang.detect(message.content, 1);
      const targetLang = interaction.locale.substring(0, 2);
      console.log(targetLang);
      // const targetLang = require('../config.json').translator.targetLang;

      if (sourceLang.length == 0) {
        return interaction.followUp(":x: Couldn't detect a language.");
      }
      const translateurl =
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
        sourceLang[0][0] +
        "&tl=" +
        targetLang +
        "&dt=t&q=" +
        encodeURI(message.content);

      const fetch = require("node-fetch");
      await fetch(translateurl)
        .then(async (response) => {
          const data = await response.json();

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

          interaction.followUp({
            content: `[${message.author.tag} said:](${msgLink}) ${data[0][0][0]}`,
            components: [buttons],
          });
        })
        .catch((err) => interaction.followUp(`:x: ${err}`));
    }

    if (
      interaction.isUserContextMenuCommand() &&
      interaction.commandName == "Time for user"
    ) {
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
    }

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName == "setup_userdb"
    ) {
      const { modal } = require("../../commands/interaction-specific/userdb");
      interaction.showModal(modal);
    }
  }
}
module.exports = {
  ReadyListener,
};
