const { Listener } = require("@sapphire/framework");
const {
  messageLink,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { Translate } = require('@google-cloud/translate').v2;
const { Translator } = require('deepl-node');
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
      interaction.commandName == "Translate message (DeepL)"
    ) {
      try {
        // console.log(interaction.targetMessage);
        const db = await UserDB.findById(interaction.user.id);

        await interaction.deferReply({ ephemeral: db ? db.ephemeral : false });

        const message = interaction.targetMessage;

        const options = {appInfo: { appName: 'PhoenixBot', appVersion: '1.0.0' }, maxRetries: 5, minTimeout: 10000};
        const transgender = new Translator(process.env["deeplkey"], options);
        transgender.translateText(message.content, null, interaction.locale)
        .then(async (result) => {
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
                .setURL("https://support.discord.com/hc/en-us/articles/21334461140375-Using-Apps-on-Discord")
                .setLabel("Why am I seeing this")
                .setEmoji(`${this.container.emojis.success}`)
                .setStyle(ButtonStyle.Link),
            )
            .addComponents(
              new ButtonBuilder()
                .setCustomId("userbotephemeral-" + interaction.user.id)
                .setLabel("Toggle ephemeral")
                .setStyle(ButtonStyle.Secondary),
            );

          console.log(result);
          interaction.followUp({
            content: `[${message.author.tag} said:](<${msgLink}>) ${result.text}\n-# Translated using DeepL • \`${result.detectedSourceLang} => ${interaction.locale}\``,
            allowedMentions: { parse: [] },
            components: [buttons]
          })
        })
        .catch((err) => {
          interaction.followUp(`${this.container.emojis.error} ${err}`);
        });
      } catch (err) {
        console.error(`Translation failed`, err.message);
        // interaction.followUp(`${this.container.emojis.error} ${err}`);
      }
    }
    
    if (
      interaction.isMessageContextMenuCommand() &&
      interaction.commandName == "Translate message"
    ) {
      try {
        // console.log(interaction.targetMessage);
        const db = await UserDB.findById(interaction.user.id);

        await interaction.deferReply({ ephemeral: db ? db.ephemeral : false });

        const message = interaction.targetMessage;

        const translate = new Translate({
          key: process.env["googlekey"],
          projectId: process.env["googleid"]
        });
  
        let [detections] = await translate.detect(message.content);
        detections = Array.isArray(detections) ? [detections][0] : detections;
        const detected = detections.language;
  
        translate.translate(message.content, {
          format: "text",
          from: detected.substring(0,2),
          to: interaction.locale.substring(0,2)
        
        })
        .then(async (result) => {
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
                .setURL("https://support.discord.com/hc/en-us/articles/21334461140375-Using-Apps-on-Discord")
                .setLabel("Why am I seeing this")
                .setEmoji(`${this.container.emojis.success}`)
                .setStyle(ButtonStyle.Link),
            )
            .addComponents(
              new ButtonBuilder()
                .setCustomId("userbotephemeral-" + interaction.user.id)
                .setLabel("Toggle ephemeral")
                .setStyle(ButtonStyle.Secondary),
            );

          interaction.followUp({
            content: `[${message.author.tag} said:](<${msgLink}>) ${result[0]}\n-# Translated using Google • \`${detected} => ${interaction.locale}\``,
            allowedMentions: { parse: [] },
            components: [buttons],
          })
        })
        .catch((err) => {
          interaction.followUp(`${this.container.emojis.error} ${err}`);
        });
      } catch (err) {
        console.error(`Translation failed`, err.message);
        // interaction.followUp(`${this.container.emojis.error} ${err}`);
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
            `${this.container.emojis.error} **${member.username}** does not have a timezone set.`,
          );
        }
        if (!usersettings.timezone) {
          return interaction.followUp(
            `${this.container.emojis.error} **${member.username}** does not have a timezone set.`,
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
                .setURL("https://support.discord.com/hc/en-us/articles/21334461140375-Using-Apps-on-Discord")
                .setLabel("Why am I seeing this")
                .setEmoji(`${this.container.emojis.success}`)
                .setStyle(ButtonStyle.Link),
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
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      }
    }
  }
}
module.exports = {
  ReadyListener,
};
