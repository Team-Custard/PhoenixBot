const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors, ChatInputCommandInteraction } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "slowmode",
      aliases: [`sm`, `cooldown`],
      description:
        "Changes the channel slowmode.",
      detailedDescription: {
        usage: "slowmode <time> [channel]",
        examples: ["slowmode 1m", "slowmode 3s #general"],
        args: [
          "time : The channel cooldown up to 6 hours",
          "channel : The channel to change",
        ],
      },
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ModerateMembers],
      preconditions: ["module"]
    });
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputRun(interaction) {
    await interaction.deferReply();
    
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const slowmode = require('ms')(interaction.options.getString('time'));

    if (slowmode < 0 || slowmode > 21600) return interaction.followUp(`${this.container.emojis.error} Invalid slowmode time.`);

    await channel.setRateLimitPerUser(slowmode / 1000, `(Slowmode changed by ${interaction.user.tag})`);

    await interaction.followUp(slowmode > 0 ? `${this.container.emojis.success} Slowmode of ${channel} is now **${await require('pretty-ms')(slowmode, {verbose: true})}**.` : `${this.container.emojis.success} Slowmode of ${channel} has been disabled.`);
  }
  
  async messageRun(message, args) {
    const slowmode = require('ms')(await args.pick('string'));
      
    const channel = await args.pick('channel').catch(() => message.channel);
    
    if (slowmode < 0 || slowmode > 21600) return message.reply(`${this.container.emojis.error} Invalid slowmode time.`);

    await channel.setRateLimitPerUser(slowmode / 1000, `(Slowmode changed by ${message.author.tag})`);

    await message.reply(slowmode > 0 ? `${this.container.emojis.success} Slowmode of ${channel} is now **${await require('pretty-ms')(slowmode, {verbose: true})}**.` : `${this.container.emojis.success} Slowmode of ${channel} has been disabled.`);
  }
}
module.exports = {
  PingCommand,
};
