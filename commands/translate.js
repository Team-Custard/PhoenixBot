const { Command } = require('@sapphire/framework');
const { ApplicationCommandType, messageLink, REST, Routes } = require('discord.js');

class UserCommand extends Command {
  constructor(context, options) {
    super(context, { ...options });
  }


  registerApplicationCommands(registry) {
    registry.idHints = ['1226950912942145637', '1223438156204871762'];
    registry
    /* .registerContextMenuCommand((builder) =>
      builder
        .setName('Translate message')
        .setType(ApplicationCommandType.Message)
        .setDMPermission(true)
    ) */
    .registerChatInputCommand((builder) =>
    builder.setName('translate').setDescription('Translates text to the language currently set on your account.')
    .addStringOption(option => option.setName('text').setDescription('The text to translate').setRequired(true))
    .setDMPermission(false));

    const rest = new REST().setToken(this.container.client.token);
    rest.get(Routes.applicationCommands(this.container.client.id)).then(res => {
      // console.log(res);
      if (!res.find(r => r.name == "Translate message")) {
        console.log('Registering Translate message');
        rest.post(Routes.applicationCommands(this.container.client.id), {
          body: {
            name: 'Translate message',
            type: 3,
            integration_types: [1],
            contexts: [0, 1, 2]
          }
        }).then(() => {console.log('User command Translate message registered successfully.');})
        .catch((err) => console.log('User command Translate message failed. It probably already exists.', err));
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
    await interaction.deferReply();
    const text = interaction.options.getString('text');

    const detectLang = new (require('languagedetect'));
    detectLang.setLanguageType('iso2');
    const sourceLang = await detectLang.detect(text, 1);
    const targetLang = interaction.locale.substring(0, 2);
    console.log(targetLang);

    if (sourceLang.length == 0) return interaction.followUp(':x: Couldn\'t detect a language.');
    const translateurl = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + sourceLang[0][0] + "&tl=" + targetLang + "&dt=t&q=" + encodeURI(text);

    const fetch = require('node-fetch');
    await fetch(translateurl).then(async (response) => {
        const data = await response.json();

        interaction.followUp({ content: `Translated to your language: ${data[0][0][0]}\n\nYou can now translate people's messages from any server. Use \`/info translate\` to learn more.` });
    }).catch((err) => interaction.followUp(`:x: ${err}`));
  }
}
module.exports = {
  UserCommand
};