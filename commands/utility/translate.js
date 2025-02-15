const { Command } = require("@sapphire/framework");
const { REST, Routes, PermissionFlagsBits } = require("discord.js");

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
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
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
                integration_types: [1],
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

    if (sourceLang.length == 0) return interaction.followUp(':x: Couldn\'t detect a language.');
    const translateurl = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + sourceLang[0][0] + "&tl=" + targetLang + "&dt=t&q=" + encodeURI(message.content);

    const fetch = require('node-fetch');
    await fetch(translateurl).then(async (response) => {
        const data = await response.json();

            const msgLink = await messageLink(message.channel.id, message.id, message.guild.id);
            interaction.followUp({ content: `[${message.author.tag} said:](${msgLink}) ${data[0][0][0]}` });

    }).catch((err) => interaction.followUp(`:x: ${err}`));
  } */

  async chatInputRun(interaction) {
    const content = await interaction.options.getString("text");
    const translate = require('translate');
    await interaction.deferReply();

    const detect = require("text-language-detector");
    const detected = await detect(content);
    translate.engine = "google";
    translate.key = process.env.googlekey;

    const text = await translate(content, { from: detected.match_language_data.code2, to: interaction.locale.substring(0, 2) });
    interaction.followUp({ content: `You said: ${text}`, allowedMentions: { parse: [] } });
  }

  async messageRun(message, args) {
    const content = await args.rest("string");
    const translate = require('translate');

    const detect = require("text-language-detector");
    const detected = await detect(content);
    translate.engine = "google";
    translate.key = process.env.googlekey;

    const text = await translate(content, { from: detected.match_language_data.code2, to: "en" });
    message.reply({ content: `You said: ${text}`, allowedMentions: { parse: [] } });
  }
}
module.exports = {
  UserCommand,
};
