const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, AttachmentBuilder, Attachment } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const bent = require('bent');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'dog',
      aliases: ['dogs'],
      description: 'Send a random dog from [dog ceo](https://dog.ceo).',
      detailedDescription: {
        usage: 'dog',
        examples: ['dog'],
        args: ['No args included.']
      },
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ['modonly']
    });
  }

  async messageRun(message) {
    const getStream = await bent('https://dog.ceo');
    const stream = await getStream('/api/breeds/image/random');

    if (stream.statusCode != 200) return send(message, `\`\`\`${stream.status}\`\`\``);

    const obj = await stream.json();

    await send(message, { files: [obj.message] });
  }
}
module.exports = {
  PingCommand
};