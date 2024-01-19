const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const search = require('youtube-search');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'youtube',
      aliases: ['yt'],
      description: 'Searches for a video on youtube.',
      detailedDescription: {
        usage: 'youtube <query>',
        examples: ['youtube How to basic', 'youtube Fnaf markiplier'],
        args: ['<query> : The video to search for.']
      },
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const query = await args.rest('string');

    const opts = {
        maxResults: 1,
        key: process.env.youtubekey,
        type: 'video'
    };

    search(query, opts, function(err, results) {
        if (err) return send(message, { content: `\`\`\`${err.message}\`\`\`` });
        send(message, { content: `${results[0].link}` });
      });
  }
}
module.exports = {
  PingCommand
};