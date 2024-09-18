const { Command, Args } = require("@sapphire/framework");
const { REST, Routes, PermissionFlagsBits } = require("discord.js");
const { Translate } = require('@google-cloud/translate').v2;
const { Translator } = require('deepl-node');

class UserCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "translate",
      aliases: [],
      description: "Translates text to your current language",
      detailedDescription: {
        usage: "translate <text>",
        examples: ["translate Hola"],
        args: ["text: The text to translate"],
        flags: ["deepl: Use deepl instead of Google"]
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      flags: true,
      preconditions: ["module"]
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ["1226950912942145637", "1223438156204871762"];
    registry
      /* .registerContextMenuCommand((builder) =>
      builder
        .setName('Translate message')
        .setType(ApplicationCommandType.Message)
        .setDMPermission(true)
    ) */
      .registerChatInputCommand((builder) =>
        builder
          .setName("translate")
          .setDescription(
            "Translates text to the language currently set on your account.",
          )
          .addStringOption((option) =>
            option
              .setName("text")
              .setDescription("The text to translate")
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName("translator")
              .setDescription("The translator to use")
              .setChoices(
                { name: 'Google Translate', value: 'google' },
                { name: 'DeepL', value: 'deepl' }
              )
              .setRequired(false)
          )
          .setDMPermission(false),
      );

    const rest = new REST().setToken(this.container.client.token);
    rest
      .get(Routes.applicationCommands(this.container.client.id))
      .then((res) => {
        // console.log(res);
        if (!res.find((r) => r.name == "Translate message")) {
          console.log("Registering Translate message");
          rest
            .post(Routes.applicationCommands(this.container.client.id), {
              body: {
                name: "Translate message",
                type: 3,
                integration_types: [0, 1],
                contexts: [0, 1, 2],
              },
            })
            .then(() => {
              console.log(
                "User command Translate message registered successfully.",
              );
            })
            .catch((err) =>
              console.log(
                "User command Translate message failed. It probably already exists.",
                err,
              ),
            );
        }
        if (!res.find((r) => r.name == "Translate message (DeepL)")) {
          console.log("Registering Translate message");
          rest
            .post(Routes.applicationCommands(this.container.client.id), {
              body: {
                name: "Translate message (DeepL)",
                type: 3,
                integration_types: [0, 1],
                contexts: [0, 1, 2],
              },
            })
            .then(() => {
              console.log(
                "User command Translate message registered successfully.",
              );
            })
            .catch((err) =>
              console.log(
                "User command Translate message failed. It probably already exists.",
                err,
              ),
            );
        }
      });
  }

  /* async contextMenuRun(interaction) {
    console.log(interaction);
    await interaction.deferReply({ ephemeral: true });
    const message = interaction.targetMessage;

    const detectLang = new (require('languagedetect'));
    detectLang.setLanguageType('iso2');
    const sourceLang = await detectLang.detect(message.content, 1);
    const targetLang = require('../config.json').translator.targetLang;

    if (sourceLang.length == 0) return interaction.followUp('${this.container.emojis.error} Couldn\'t detect a language.');
    const translateurl = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + sourceLang[0][0] + "&tl=" + targetLang + "&dt=t&q=" + encodeURI(message.content);

    const fetch = require('node-fetch');
    await fetch(translateurl).then(async (response) => {
        const data = await response.json();

            const msgLink = await messageLink(message.channel.id, message.id, message.guild.id);
            interaction.followUp({ content: `[${message.author.tag} said:](${msgLink}) ${data[0][0][0]}` });

    }).catch((err) => interaction.followUp(`${this.container.emojis.error} ${err}`));
  } */

  async chatInputRun(interaction) {
    const content = await interaction.options.getString("text");
    let translator = await interaction.options.getString("translator");
    if (!translator) translator = "google";
    await interaction.deferReply();

    if (translator == "deepl") {
      const options = {appInfo: { appName: 'PhoenixBot', appVersion: '1.0.0' }, maxRetries: 5, minTimeout: 10000};
      const transgender = new Translator(process.env["deeplkey"], options);
      transgender.translateText(content, null, interaction.locale)
      .then((result) => {
        console.log(result);
        interaction.followUp({
          content: `${result.text}\n-# Translated using DeepL • \`${result.detectedSourceLang} => ${interaction.locale}\``,
          allowedMentions: { parse: [] }
        })
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
    } 
    else {
      const translate = new Translate({
        key: process.env["googlekey"],
        projectId: process.env["googleid"]
      });

      let [detections] = await translate.detect(content);
      detections = Array.isArray(detections) ? [detections][0] : detections;
      const detected = detections.language;

      translate.translate(content, {
        format: "text",
        from: detected.substring(0,2),
        to: interaction.locale.substring(0,2)
      
      })
      .then((result) => {
        console.log(result);
        interaction.followUp({
          content: `${result[0]}\n-# Translated using Google • \`${detected} => ${interaction.locale}\``,
          allowedMentions: { parse: [] }
        })
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
    }
  }

  async messageRun(message, args) {
    const deepl = args.getFlags('deepl', 'd')
    const content = await args.rest("string");

    if (deepl) {
      const options = {appInfo: { appName: 'PhoenixBot', appVersion: '1.0.0' }, maxRetries: 5, minTimeout: 10000};
      const transgender = new Translator(process.env["deeplkey"], options);
      transgender.translateText(content, null, "en-US")
      .then((result) => {
        console.log(result);
        message.reply({
          content: `${result.text}\n-# Translated using DeepL • \`${result.detectedSourceLang} => en-US\``,
          allowedMentions: { parse: [] }
        })
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
    } else {
      const translate = new Translate({
        key: process.env["googlekey"],
        projectId: process.env["googleid"]
      });

      let [detections] = await translate.detect(content);
      detections = Array.isArray(detections) ? [detections][0] : detections;
      const detected = detections.language;

      translate.translate(content, {
        format: "text",
        from: detected.substring(0,2),
        to: "en"
      
      })
      .then((result) => {
        console.log(result);
        message.reply({
          content: `${result[0]}\n-# Translated using Google • \`${detected} => en-US\``,
          allowedMentions: { parse: [] }
        })
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
    }
  }
}
module.exports = {
  UserCommand,
};
