const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'ping',
      aliases: ['latency'],
      description: 'Fetches the bot ping',
      detailedDescription: {
        usage: 'ping',
        examples: ['ping'],
        args: ['No args included.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages]
    });
  }

  async messageRun(message) {
    const msg = await send(message, ':ping_pong: Pinging...');

    const content = `Bot Latency ${Math.round(this.container.client.ws.ping)}ms.\nAPI Latency ${
      msg.createdTimestamp - message.createdTimestamp
    }ms.`;

    return msg.edit(content);
  }
}
module.exports = {
  PingCommand
};