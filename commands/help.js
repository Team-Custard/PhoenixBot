const { Command, CommandStore } = require('@sapphire/framework');
const { EmbedBuilder, Colors, PermissionFlagsBits } = require("discord.js");
const { send } = require('@sapphire/plugin-editable-commands');
const { emojis } = require('../settings.json');
const database = require('../Tools/SettingsSchema');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'help',
      aliases: ['helpme'],
      description: 'Displays help info. Displays the list of commands if no command ',
      detailedDescription: {
        usage: 'help [command]',
        examples: ['help', 'help prefix', 'help ping'],
        args: ['[command] : The command to show help for.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
    });
  }

  async messageRun(message, args) {
    const option = await args.pick('string').catch(() => "");
    if (option == "") {
      const serverdb = await database.findById(message.guild.id).exec();
      const modonly = serverdb.modonly;
      const general = [];
      const config = [];
      const fun = [];
      this.container.client.stores.get('commands').forEach((item) => {
        if (item.category == 'general') general.push(`\`${item.name}\``);
        if (item.category == 'config') config.push(`\`${item.name}\``);
        if (item.category == 'fun') fun.push(`\`${item.name}\``);
      });

      const embed = new EmbedBuilder()
      .setTitle("All commands")
      .setDescription(`The following commands are available.${modonly == true ? `\nThis bot is limited to mods only.` : ``}\nUse \`help [command name]\` to view specific details.`)
      .setColor(Colors.Orange)
      .setThumbnail(this.container.client.user.avatarURL({ format: 'png', size: 2048 }))
      .addFields([
        { name: `General`, value: general.join(', ') },
        { name: `Config`, value: config.join(', ') },
        { name: `Fun`, value: fun.join(', ') }
      ]);
      return send(message, { embeds: [embed] });
    }
    else {
      const cmd = this.container.client.stores.get('commands').find(i => i.name === option);
      if (cmd == null) return send(message, { content: `${emojis.error} No such command was found.` });
      const embed = new EmbedBuilder()
      .setTitle(`${cmd.name} (${cmd.aliases.join(', ')})`)
      .setDescription(`Category: ${cmd.fullCategory}\nUsage: ${cmd.detailedDescription.usage}\n${cmd.description}`)
      .addFields([
        { name: 'Args', value: cmd.detailedDescription.args.join('\n') },
        { name: 'Examples', value: cmd.detailedDescription.examples.join('\n') }
      ])
      .setColor(Colors.Orange);
      return send(message, { embeds: [embed] });
    }
  }
}
module.exports = {
  PingCommand
};