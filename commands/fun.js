const { Subcommand } = require('@sapphire/plugin-subcommands');
const { BucketScope } = require('@sapphire/framework');
const bent = require('bent');

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'fun',
      subcommands: [
        {
          name: 'cat',
          chatInputRun: 'chatInputCat'
        },
        {
          name: 'dog',
          chatInputRun: 'chatInputDog'
        },
        {
          name: 'kitten',
          chatInputRun: 'chatInputKitten'
        },
        {
          name: 'meme',
          chatInputRun: 'chatInputMeme'
        }
      ],
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ['1227016558778519622'];
    registry.registerChatInputCommand((builder) =>
      builder.setName('fun').setDescription('Fun commands')
      .addSubcommand((command) => command.setName('cat').setDescription('Sends a random cat'))
      .addSubcommand((command) => command.setName('dog').setDescription('Sends a random dog'))
      .addSubcommand((command) => command.setName('kitten').setDescription('Sends a random baby cat owo'))
      .addSubcommand((command) => command.setName('meme').setDescription('Sends a random meme from reddit'))
      .setDMPermission(false));
  }

  async chatInputCat(interaction) {
    await interaction.deferReply();
    const getStream = await bent('https://cataas.com/');
    const stream = await getStream('/cat');

    if (stream.statusCode != 200) return interaction.followUp(`:x: ${stream.status}`);

    await interaction.followUp({ files: [stream] });
  }

  async chatInputDog(interaction) {
    await interaction.deferReply();
    const getStream = await bent('https://dog.ceo');
    const stream = await getStream('/api/breeds/image/random');

    if (stream.statusCode != 200) return interaction.followUp(`:x: ${stream.status}`);

    const obj = await stream.json();

    await interaction.followUp({ files: [obj.message] });
  }

  async chatInputKitten(interaction) {
    await interaction.deferReply();
    const getStream = await bent('https://cataas.com/');
    const stream = await getStream('/cat/kitten');

    if (stream.statusCode != 200) return interaction.followUp(`:x: ${stream.status}`);

    await interaction.followUp({ files: [stream] });
  }

  async chatInputMeme(interaction) {
    await interaction.deferReply();
    const getStream = await bent('https://meme-api.com');
    const stream = await getStream('/gimme');

    if (stream.statusCode != 200) return interaction.followUp(`:x: ${stream.status}`);

    const obj = await stream.json();

    if (obj.nsfw == true && !interaction.channel.nsfw) return interaction.followUp(`Refusing to send the scraped reddit post because the post is nsfw.`);
    await interaction.followUp({ content: `${obj.title} | ${obj.subreddit} | [Post link](<${obj.postLink}>)`, files: [obj.url] });
  }
}
module.exports = {
  PingCommand
};