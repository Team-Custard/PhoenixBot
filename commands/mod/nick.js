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
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.ManageNicknames],
      requiredUserPermissions: [PermissionFlagsBits.ManageNicknames],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    const member = await args.pick("member");
    const newnick = await args.rest("string").catch(() => null);

    if (message.member == member) {
      return message.reply(`${this.container.emojis.error} Bruh. On yourself?`);
    }
    if (
      member.roles.highest.position >=
      message.guild.members.me.roles.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} I'm not high enough in the role hiarchy to moderate this member.`,
      );
    }
    if (
      member.roles.highest.position >= message.member.roles.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} You aren't high enough in the role hiarchy to moderate this member.`,
      );
    }
    if (!member.manageable) {
      return message.reply(`${this.container.emojis.error} This user is not manageable.`);
    }

    const oldnickname = member.displayName;
    await member.setNickname(newnick, `(Nick by ${message.author.tag})`);

    message.reply(
      `${this.container.emojis.success} ${newnick ? `Set **${member.user.tag}**'s nickname from \`${oldnickname}\` to \`${newnick}\` successfully.` : `Reset **${member.user.tag}**'s nickname.`}`,
    );
  }
}
module.exports = {
  PingCommand,
};
