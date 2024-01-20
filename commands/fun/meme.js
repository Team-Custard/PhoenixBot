const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, AttachmentBuilder, Attachment } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const bent = require('bent');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'meme',
      aliases: ['memes'],
      description: 'Fetches a meme from the subreddits r/memes, r/dankmemes, and r/me_irl. This is an alternative to the \`reddit\` command. Note nsfw posts will not be shown outside nsfw channels.',
      detailedDescription: {
        usage: 'meme',
        examples: ['meme'],
        args: ['No args included.']
      },
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ['modonly']
    });
  }

  async messageRun(message) {
    const getStream = await bent('https://meme-api.com');
    const stream = await getStream('/gimme');

    if (stream.statusCode != 200) return send(message, `\`\`\`${stream.status}\`\`\``);

    const obj = await stream.json();

    if (obj.nsfw == true && !message.channel.nsfw) return send(message, { content: `Refusing to send the scraped reddit post because the post is nsfw.` });
    await send(message, { content: `${obj.title} | ${obj.subreddit} | [Post link](<${obj.postLink}>)`, files: [obj.url] });
  }
}
module.exports = {
  PingCommand
};