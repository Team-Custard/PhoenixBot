const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "asciify",
      aliases: [`ascii`,`decancer`,`nofancyletters`],
      description: "Removes special characters from a member's nickname.",
      detailedDescription: {
        usage: "asciify <member>",
        examples: ["asciify sylveondev"],
        args: ["member : The member to change the name of"],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.ManageNicknames],
      requiredUserPermissions: [PermissionFlagsBits.ManageNicknames],
    });
  }

  async messageRun(message, args) {
    const normalisationForm = "NFKC";
    const member = await args.pick("member");

    if (message.member == member) return message.reply(`:x: Bruh. On yourself?`);
    if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) return message.reply(`:x: I'm not high enough in the role hiarchy to moderate this member.`);
    if (member.roles.highest.position >= message.member.roles.highest.position) return message.reply(`:x: You aren't high enough in the role hiarchy to moderate this member.`);
    if (!member.manageable) return message.reply(`:x: This user is not manageable.`);
    
    const oldnickname = member.displayName;
    const nickname = oldnickname.normalize(normalisationForm);

    await member.setNickname(nickname, `(Asciify by ${message.author.tag})`);
    message.reply(`:white_check_mark: Asciified **${member.user.tag}**'s nickname from \`${oldnickname}\` to \`${nickname}\` successfully.`);
  }
}
module.exports = {
  PingCommand,
};
