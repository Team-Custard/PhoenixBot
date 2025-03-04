const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "nick",
      aliases: [`setnick`, `nickname`],
      description: "Sets a member's nickname.",
      detailedDescription: {
        usage: "nick <member> [nickname]",
        examples: ["nick sylveondev Sylveon", "nick sylveondev"],
        args: ["member : The member to change the name of", "nickname : The new nickname, leave blank to reset the nickname"],
      },
      cooldownDelay: 1_800_000,
      cooldownLimit: 20,
      requiredClientPermissions: [PermissionFlagsBits.ManageNicknames],
      suggestedUserPermissions: [PermissionFlagsBits.ManageNicknames],
      preconditions: ["module"]
    });
  }

  async chatInputRun(interaction) {
    const member = await interaction.options.getMember("member");
    const newnick = await interaction.options.getString("nickname")

    if (interaction.member == member) {
      return interaction.reply(`${this.container.emojis.error} You can't change your own nickname with the bot.`);
    }
    if (
      member.roles.highest.position >=
      interaction.guild.members.me.roles.highest.position
    ) {
      return interaction.reply(
        `${this.container.emojis.error} I'm not high enough in the role hierarchy to moderate this member.`,
      );
    }
    if (
      member.roles.highest.position >= interaction.member.roles.highest.position
    ) {
      return interaction.reply(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to moderate this member.`,
      );
    }
    if (!member.manageable) {
      return interaction.reply(`${this.container.emojis.error} This user is not manageable.`);
    }

    const oldnickname = member.displayName;
    await member.setNickname(newnick, `(Nick by ${interaction.user.tag})`);

    interaction.reply(
      `${this.container.emojis.success} ${newnick ? `**${member.user.tag}**'s nickname has been changed to \`${newnick}\`.` : `**${member.user.tag}**'s nickname has been reset.`}`,
    );
  }
  
  async messageRun(message, args) {
    const member = await args.pick("member");
    const newnick = await args.rest("string").catch(() => null);

    if (message.member == member) {
      return message.reply(`${this.container.emojis.error} You can't change your own nickname with the bot.`);
    }
    if (
      member.roles.highest.position >=
      message.guild.members.me.roles.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} I'm not high enough in the role hierarchy to moderate this member.`,
      );
    }
    if (
      member.roles.highest.position >= message.member.roles.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to moderate this member.`,
      );
    }
    if (!member.manageable) {
      return message.reply(`${this.container.emojis.error} This user is not manageable.`);
    }

    const oldnickname = member.displayName;
    await member.setNickname(newnick, `(Nick by ${message.author.tag})`);

    message.reply(
      `${this.container.emojis.success} ${newnick ? `**${member.user.tag}**'s nickname has been changed to \`${newnick}\`.` : `**${member.user.tag}**'s nickname has been reset.`}`,
    );
  }
}
module.exports = {
  PingCommand,
};
