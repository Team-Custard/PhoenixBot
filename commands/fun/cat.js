const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, AttachmentBuilder, Attachment } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const bent = require('bent');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'cat',
      aliases: ['cats'],
      description: 'Send a random cat from [cataas](https://cataas.com).',
      detailedDescription: {
        usage: 'cat',
        examples: ['cat'],
        args: ['No args included.']
      },
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ['modonly']
    });
  }

  async messageRun(message) {
    const getStream = await bent('https://cataas.com/');
    const stream = await getStream('/cat');

    if (stream.statusCode != 200) return send(message, `\`\`\`${stream.status}\`\`\``);

    //const obj = await stream.json();

    await send(message, { files: [stream] });
  }
}
module.exports = {
  PingCommand
};