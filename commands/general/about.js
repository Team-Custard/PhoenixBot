const { Command } = require('@sapphire/framework');
const { EmbedBuilder, Colors, PermissionFlagsBits } = require("discord.js");
const { send } = require('@sapphire/plugin-editable-commands');

class AboutCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'about',
      aliases: ['phoenixbot'],
      description: 'Shows the about embed for the bot.',
      detailedDescription: {
        usage: 'about',
        examples: ['about'],
        args: ['No args included.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
    });
  }

  async messageRun(message) {
    const embed = new EmbedBuilder()
    .setTitle(`About ${this.container.client.user.username}`)
    .setDescription(`PhoenixBot is an open-source bot by SylveonDev that features moderation, utilities, and some fun. The bot is based on discord.js and the sapphire command framework. Requires nodejs and mongodb atlas to function.\n\nBot configuration\nBot Version: \` ${require('../../package.json').version} \`    Commands: \`${this.container.applicationCommandRegistries.acquire.length}\`\n\n[\`[Github link]\`](https://github.com/SylveonDev/SylveonBot)    [\`[Sapphire]\`](https://www.sapphirejs.dev)    [\`[Discord server]\`](https://discord.gg/efE9c9AkWy)`)
    .setThumbnail(this.container.client.user.displayAvatarURL({ extension:"png", size:512 }))
    .setFooter({ text: 'Bot booted up', iconURL: 'https://media.discordapp.net/attachments/1007635929629995070/1187822905212543077/timer-icon-131.png' })
    .setTimestamp(this.container.client.readyTimestamp)
    .setColor(Colors.Orange);
    return send(message, { embeds: [embed] });
  }
}
module.exports = {
  AboutCommand
};