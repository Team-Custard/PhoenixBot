const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'updates',
        aliases: ['subscribe'],
        description: 'Follows the Phoenix update logs and announcements channels so you can recieve updates reguarding Phoenix.',
        detailedDescription: {
          usage: 'afk [reason]',
          examples: ['afk Busy rn', 'afk Doing my studies'],
          args: ['reason: The reason you are afk.']
        },
        cooldownDelay: 3_000,
        requiredClientPermissions: [PermissionFlagsBits.SendMessages],
        requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = [];
    registry.registerChatInputCommand((builder) =>
      builder.setName('updates').setDescription('Follows the Phoenix update logs and announcement channels.')
      .addChannelOption(option => option.setName('channel').setDescription('The channel to subscribe to').setRequired(true))
      .setDMPermission(false)
      .setDefaultMemberPermissions(32)
    );
  }

  async chatInputRun(interaction) {
    await interaction.deferReply();
    const channel = await interaction.options.getChannel('channel');
    const newschannel = await this.container.client.channels.fetch('1224181217952272424');
    await newschannel.addFollower(channel, `(${interaction.user.username}) Subscribing to bot announcements.`);
    interaction.followUp(`:white_check_mark: Phoenix announcements are now being sent to ${channel}.`);
  }

  async messageRun(message, args) {
    const channel = await args.pick('channel');
    const newschannel = await this.container.client.channels.fetch('1224181217952272424');
    await newschannel.addFollower(channel, `(${message.author.username}) Subscribing to bot announcements.`);
    message.reply(`:white_check_mark: Phoenix announcements are now being sent to ${channel}.`);
  }
}
module.exports = {
  PingCommand
};