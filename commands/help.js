const { Command } = require("@sapphire/framework");
const { EmbedBuilder, Colors, PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "help",
      aliases: ["helpme"],
      description:
        "Displays help info. Displays the list of commands if no command ",
      detailedDescription: {
        usage: "help [flag] [command]",
        examples: ["help", "help prefix", "help ping"],
        args: ["[command] : The command to show help for."],
        flags: ["dev : Show dev commands (Can't run these commands, no point in using this)"]
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      flags: true,
    });
  }

  async messageRun(message, args) {
    const showDev = args.getFlags('dev', 'd');
    const option = await args.pick("string").catch(() => "");
    if (option == "") {
      const general = [];
      const config = [];
      const fun = [];
      const mod = [];
      const social = [];
      const automod = [];
      const dev = [];
      this.container.client.stores.get("commands").forEach((item) => {
        if (item.category == "utility") general.push(`\`${item.name}\``);
        if (item.category == "config") config.push(`\`${item.name}\``);
        if (item.category == "fun") fun.push(`\`${item.name}\``);
        if (item.category == "mod") mod.push(`\`${item.name}\``);
        if (item.category == "automod") automod.push(`\`${item.name}\``);
        if (item.category == "social") social.push(`\`${item.name}\``);
        if (item.category == "dev") dev.push(`\`${item.name}\``);
      });

      const embed = new EmbedBuilder()
        .setTitle("All commands")
        .setDescription(
          `The following commands are available.\nNot all commands support prefix commands. Try out slash commands to use whatever isn't supported.\nUse \`help [command name]\` to view specific details.`,
        )
        .setColor(Colors.Orange)
        .setThumbnail(
          this.container.client.user.avatarURL({ format: "png", size: 2048 }),
        )
        .setTimestamp(new Date())
        .addFields([
          { name: `Utility`, value: (general.length > 0 ? general.join(", ") : 'No commands found') },
          { name: `Fun`, value: (fun.length > 0 ? fun.join(", ") : 'No commands found') },
          { name: `Moderation`, value: (mod.length > 0 ? mod.join(", ") : 'No commands found') },
          { name: `Automod`, value: (automod.length > 0 ? automod.join(", ") : 'No commands found') },
          { name: `Social`, value: (social.length > 0 ? social.join(", ") : 'No commands found') },
          { name: `Config`, value: (config.length > 0 ? config.join(", ") : 'No commands found') },
        ]);
        if (dev.length > 0 && showDev) {
          embed.addFields([{name: "Dev", value: dev.join(", ")}]);
        }
      return message.reply({ embeds: [embed] });
    }
 else {
      const cmd = this.container.client.stores
        .get("commands")
        .find((i) => i.name === option);
      if (cmd == null) {
        return message.reply({ content: `:x: No such command was found.` });
      }
      const embed = new EmbedBuilder()
        .setTitle(`${cmd.name} ${(cmd.aliases.length > 0 ? (cmd.aliases.join(", ")) : '')}`)
        .setDescription(
          `Category: ${cmd.fullCategory}\nUsage: ${cmd.detailedDescription.usage}\n${cmd.description}`,
        )
        .setColor(Colors.Orange);
        if (cmd.detailedDescription.args) {
          embed.addFields([{name: "Args", value: cmd.detailedDescription.args.join("\n")}]);
        }
        if (cmd.detailedDescription.flags) {
          embed.addFields([{name: "Flags", value: cmd.detailedDescription.flags.join("\n")}]);
        }
        embed.addFields([{
          name: "Examples",
          value: cmd.detailedDescription.examples.join("\n"),
        }])
      return message.reply({ embeds: [embed] });
    }
  }
}
module.exports = {
  PingCommand,
};
