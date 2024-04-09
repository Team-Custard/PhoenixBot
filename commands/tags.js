// const { isMessageInstance } = require('@sapphire/discord.js-utilities');
const { Command } = require('@sapphire/framework');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, { ...options });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ['1227016558778519622'];
    registry.registerChatInputCommand((builder) =>
      builder.setName('tag').setDescription('Displays tags set by the server and Phoenix.')
      .addStringOption(option => option.setName('index').setDescription('The tag to display').setRequired(false))
      .setDMPermission(false));
  }

  async chatInputRun(interaction) {
    const indexes = require('../tools/infoStuff.json');
    const infoIndex = await interaction.options.getString('index', false);

    if (!infoIndex) {
        interaction.reply(`The following indexes are available.\n${indexes.map(i => `\`${i.name}\``)}\nUse \`/index 'index'\` to display info.`);
    }
    else {
        const ind = await indexes.find(i => i.name == infoIndex);
        if (!ind) return interaction.reply(':x: Tag not found.');
        interaction.reply(`:information_source: **${ind.name}**:\n${ind.description}\n(Tag by ${ind.creator})`);
    }
  }
}
module.exports = {
  PingCommand
};