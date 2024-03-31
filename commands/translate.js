const { Command } = require('@sapphire/framework');
const { ApplicationCommandType, messageLink } = require('discord.js');

class UserCommand extends Command {
  constructor(context, options) {
    super(context, { ...options });
  }


  registerApplicationCommands(registry) {
    registry.idHints = ['1223387547435143288', '1223438156204871762'];
    registry.registerContextMenuCommand((builder) =>
      builder
        .setName('Translate message')
        .setType(ApplicationCommandType.Message)
        .setDMPermission(false)
    ).registerChatInputCommand((builder) =>
    builder.setName('translate').setDescription('Translates text to english.')
    .addStringOption(option => option.setName('text').setDescription('The text to translate').setRequired(true))
    .setDMPermission(false)
  );
  }

  async contextMenuRun(interaction) {
    await interaction.deferReply();
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
  }

  async chatInputRun(interaction) {
    await interaction.deferReply();
    const text = interaction.options.getString('text');

    const detectLang = new (require('languagedetect'));
    const langName = await detectLang.detect(text, 1);
    detectLang.setLanguageType('iso2');
    const sourceLang = await detectLang.detect(text, 1);
    const targetLang = require('../config.json').translator.targetLang;

    if (sourceLang.length == 0) return interaction.followUp(':x: Couldn\'t detect a language.');
    const translateurl = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + sourceLang[0][0] + "&tl=" + targetLang + "&dt=t&q=" + encodeURI(text);

    const fetch = require('node-fetch');
    await fetch(translateurl).then(async (response) => {
        const data = await response.json();

        interaction.followUp({ content: `Translated from ${langName[0][0]} to english: ${data[0][0][0]}` });
    }).catch((err) => interaction.followUp(`:x: ${err}`));
  }
}
module.exports = {
  UserCommand
};