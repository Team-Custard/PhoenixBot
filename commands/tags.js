// const { isMessageInstance } = require('@sapphire/discord.js-utilities');
const { BucketScope } = require('@sapphire/framework');
const { Subcommand } = require('@sapphire/plugin-subcommands');
const serverSettings = require('../tools/SettingsSchema');

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'tag',
      subcommands: [
        {
          name: 'list',
          chatInputRun: 'chatInputList'
        },
        {
          name: 'add',
          chatInputRun: 'chatInputAdd'
        },
        {
          name: 'remove',
          chatInputRun: 'chatInputRemove'
        },
        {
          name: 'display',
          chatInputRun: 'chatInputDisplay'
        }
      ],
      cooldownDelay: 15_000,
      cooldownLimit: 3,
      cooldownScope: BucketScope.Guild
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ['1227016558778519622'];
    registry.registerChatInputCommand((builder) =>
      builder.setName('tag').setDescription('Displays tags set by the server and Phoenix.')
      .addSubcommand((command) => command.setName('list').setDescription('List all tags in the server'))
      .addSubcommand((command) => command.setName('add').setDescription('Adds a tag to the server')
      .addStringOption(option => option.setName('name').setDescription('The name of the tag (12 char max)').setRequired(true))
      .addStringOption(option => option.setName('description').setDescription('The description of the tag (256 char max)').setRequired(true)))
      .addSubcommand((command) => command.setName('remove').setDescription('Removes a tag to the server')
      .addStringOption(option => option.setName('name').setDescription('The name of the tag').setRequired(true)))
      .addSubcommand((command) => command.setName('display').setDescription('Displays a tag')
      .addStringOption(option => option.setName('name').setDescription('The name of the tag').setRequired(true)))
      .setDMPermission(false));
  }

  async chatInputAdd(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id, serverSettings.upsert).cacheQuery();

    const tagName = await interaction.options.getString('name');
    const tagDesc = await interaction.options.getString('description');

    const indexes = require('../tools/infoStuff.json');

    const tag = db.tags.find(t => t.name == tagName);
    const btag = indexes.find(t => t.name == tagName);

    if (tag || btag) return interaction.followUp(':x: Tag already exists.');
    if (tagName.length > 12) return interaction.followUp(':x: Tag name is too long.');
    if (tagDesc.length > 256) return interaction.followUp(':x: Tag description is too long.');
    if (db.tags.length > 25) return interaction.followUp(':x: You\'ve maxed out on the maximum of tags you can hold in the server. Limit is 25.');

    db.tags.push({
      name: tagName,
      description: tagDesc,
      creator: interaction.user.username
    });

    db.save()
    .then(() => { interaction.followUp(`:white_check_mark: Successfully added tag \`${tagName}\`.`); })
    .catch((err) => { interaction.followUp(`:x: ${err}`); });
  }

  async chatInputRemove(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id, serverSettings.upsert).cacheQuery();
    const tagName = await interaction.options.getString('name');

    const tag = db.tags.find(t => t.name == tagName);

    if (!tag) return interaction.followUp(':x: Tag does not exist.');

    for (let i = 0; i < db.tags.length; i++) {
      if (db.tags[i].name == tagName) db.tags.splice(i, 1);
    }

    db.save()
    .then(() => { interaction.followUp(`:white_check_mark: Successfully removed tag \`${tagName}\`.`); })
    .catch((err) => { interaction.followUp(`:x: ${err}`); });
  }

  async chatInputList(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id, serverSettings.upsert).cacheQuery();

    const indexes = require('../tools/infoStuff.json');

    let srvTags = db.tags;
    if (srvTags == null) {
      srvTags = [];
    }

    interaction.followUp(`The following indexes are available.\n\n**Built-in:** ${indexes.map(i => `\`${i.name}\``)}\n**Server tags:** ${srvTags.length > 0 ? srvTags.map(r => `\`${r.name}\``) : 'No tags created.'}`);
  }

  async chatInputDisplay(interaction) {
    await interaction.deferReply();
    const tagName = await interaction.options.getString('name');

    const db = await serverSettings.findById(interaction.guild.id, serverSettings.upsert).cacheQuery();

    const indexes = require('../tools/infoStuff.json');

    const tag = db.tags.find(t => t.name == tagName);
    if (tag) {
      interaction.followUp(`:information_source: **${tag.name}**:\n${tag.description}\n(Tag by ${tag.creator})`);
    }
    else {
      const btag = indexes.find(t => t.name == tagName);
      if (btag) {
        interaction.followUp(`:information_source: **${btag.name}**:\n${btag.description}\n(Tag by ${btag.creator})`);
      }
      else {
        interaction.followUp(':x: Tag not found.');
      }
    }
  }
}
module.exports = {
  PingCommand
};