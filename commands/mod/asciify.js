const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const { weirdToNormalChars } = require('weird-to-normal-chars');
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "asciify",
      aliases: [`asc`, `ascii`, `decancer`, `nofancyletters`],
      description: "Removes special characters from a member's nickname.",
      detailedDescription: {
        usage: "asciify <member>",
        examples: ["asciify sylveondev"],
        args: ["member : The member to change the name of"],
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
  
      if (interaction.member == member) {
        return interaction.reply(`${this.container.emojis.error} You can't use this on yourself.`);
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
      const nickname = weirdToNormalChars(oldnickname);
  
      await member.setNickname(nickname, `(Asciify by ${interaction.user.tag})`);
      interaction.reply(
        `${this.container.emojis.success} Asciified **${member.user.tag}**'s nickname from \`${oldnickname}\` to \`${nickname}\` successfully.`,
      );
    }
  
  async messageRun(message, args) {
    const member = await args.pick("member");

    if (message.member == member) {
      return message.reply(`${this.container.emojis.error} You can't use this on yourself.`);
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
    const nickname = weirdToNormalChars(oldnickname);

    await member.setNickname(nickname, `(Asciify by ${message.author.tag})`);
    message.reply(
      `${this.container.emojis.success} Asciified **${member.user.tag}**'s nickname from \`${oldnickname}\` to \`${nickname}\` successfully.`,
    );
  }
}
module.exports = {
  PingCommand,
};
