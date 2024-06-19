const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

function logging(message, member, casedetails) {

}

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "warn",
      aliases: [`w`,`strike`],
      description: "Adds an infraction to a member.",
      detailedDescription: {
        usage: "warn <member> [flags] [reason] ",
        examples: ["warn sylveondev Being cool", "warn bill11 Being a raccoon --silent"],
        args: ["reason : The reason for the action", "member : The member to moderate"],
        flags: [
            `Use --silent/--s to disable sending of a DM.`,
            `You can also use --hide/--h to hide yourself from the user. Only `
        ]
      },
      cooldownDelay: 3_000,
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      flags: true
    });
  }

  async messageRun(message, args) {
    const member = await args.pick("member");
    const silentDM = args.getFlags('silent', 's');
    const hideMod = args.getFlags('hide', 'h');
    const reason = await args.rest("string").catch(() => `No reason specified`);

    if (message.member == member) return message.reply(`:x: Bruh. On yourself?`);
    if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) return message.reply(`:x: I'm not high enough in the role hiarchy to moderate this member.`);
    if (member.roles.highest.position >= message.member.roles.highest.position) return message.reply(`:x: You aren't high enough in the role hiarchy to moderate this member.`);
    if (!member.manageable) return message.reply(`:x: This user is not manageable.`);
    
    let caseid = 0;
    const db = await serverSettings
    .findById(message.guild.id, serverSettings.upsert)
    .cacheQuery();

    caseid = db.infractions.length + 1;
    const thecase = {
        id: caseid,
        punishment: "Warn",
        member: member.id,
        moderator: message.member.id,
        reason: reason,
        expiretime: 0,
        expired: false,
        hidden: hideMod,
        modlogID: null
    };

    let dmSuccess = true;
    const embed = new EmbedBuilder()
    .setAuthor({name: message.guild.name, iconURL: message.guild.iconURL({dynamic: true})})
    .setTitle(`Your infractions has been updated`)
    .addFields(
        {name: `Details:`, value: `**ID: \` ${caseid} \` | Type:** ${thecase.punishment} | **Responsible moderator:** ${(hideMod ? `Moderator hidden` : message.author)}`},
        {name: `Reason:`, value: reason}
    )
    .setColor(Colors.Orange)
    .setTimestamp(new Date());
    if (!silentDM) member.send({embeds: [embed]}).catch(function () { dmSuccess = false });
    
    
    if (db.logging.infractions) {
        const channel = await message.guild.channels
          .fetch(db.logging.infractions)
          .catch(() => undefined);
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
            .setDescription(
              `**Offender:** ${member}\n**Moderator:** ${message.author}\n**Reason:** ${thecase.reason}`,
            )
            .setColor(Colors.Orange)
            .setFooter({text: `ID ${member.id}`})
            .setTimestamp(new Date());
  
            const msg = await channel
            .send({
              // content: '',
              embeds: [embed]
            })
            .catch((err) => {
                console.error(`[error] Error on sending to channel`, err);
                return undefined;
            });
            if (msg) thecase.modlogID = msg.id;
        }
      }

    db.infractions.push(thecase);

    await db.save();
    message.reply(`:white_check_mark: **${member.user.tag}** was warned with case id **\` ${caseid} \`**. ${(silentDM ? '' : (dmSuccess ? `(User was notified)` : `(User was not notified)`))}`);
}
}
module.exports = {
  PingCommand,
};
