const { Command, CommandStore, ListenerStore, PreconditionStore, InteractionHandlerStore } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const { ownerid, emojis } = require('../../settings.json');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'emit',
      aliases: ['emit'],
      description: 'Emits an event. This command can only be ran by the bot developer only',
      detailedDescription: {
        usage: 'emit [event]',
        examples: ['emit memberadd'],
        args: ['No args included.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ['owneronly']
    });
  }

  async messageRun(message, args) {
    const event = await args.pick('string');
    switch (event) {
        case 'memberadd': {
            this.container.client.emit('guildMemberAdd', message.member);
            break;
        }
        case 'memberremove': {
            this.container.client.emit('guildMemberRemove', message.member);
            break;
        }
    }
    await send(message, 'Done.');
  }
}
module.exports = {
  PingCommand
};