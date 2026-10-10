const { Listener } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const { sendAutomodLog } = require("../../tools/moderation");
const { scheduleMemberTask } = require("../../tools/tasks");
const { yieldsToStaging } = require("../../tools/staging");

const DAY = 86_400_000;

// Minimum account age and autokick for new members.
class AutomodMemberAdd extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberAdd", name: "automodAutokick" });
  }

  async run(member) {
    if (member.partial) member = await member.fetch();
    if (await yieldsToStaging(member.guild)) return;

    const settings = await peekSettings(member.guild.id);
    if (!settings?.automod) return;

    const minimumAge = settings.automod.minimumAge;
    if (minimumAge) {
      const accountAge = Date.now() - member.user.createdTimestamp;
      if (accountAge < minimumAge) {
        const reason = `Automod action for minimum age. Account age: ${Math.floor(accountAge / DAY)} days, required: ${minimumAge / DAY} days.`;
        await member
          .send(`${emoji("warning")} You have been automatically kicked from **${member.guild.name}** because your account is too new. You must be at least ${minimumAge / DAY} days old to join this server.`)
          .catch(() => undefined);
        try {
          await member.kick(reason);
          await sendAutomodLog(member.guild, settings, { title: "Kick (Automatic)", memberId: member.id, reason });
          return;
        }
        catch (err) {
          console.log(`Automatic minimum age kick failed: ${err}`);
        }
      }
    }

    // Throwaway and raid accounts usually never set an avatar.
    if (settings.automod.kickDefaultAvatar && !member.user.bot && !member.user.avatar) {
      const reason = "Automod action: joined with the default Discord avatar.";
      await member
        .send(`${emoji("warning")} You have been automatically kicked from **${member.guild.name}** because your account has no profile picture. Set one in Discord's settings, then you're welcome to join again.`)
        .catch(() => undefined);
      try {
        await member.kick(reason);
        await sendAutomodLog(member.guild, settings, { title: "Kick (Automatic)", memberId: member.id, reason });
        return;
      }
      catch (err) {
        console.log(`Automatic default avatar kick failed: ${err}`);
      }
    }

    if (settings.automod.autokick?.duration) {
      await scheduleMemberTask(
        "autoKick",
        { guildid: member.guild.id, memberid: member.id },
        settings.automod.autokick.duration,
      );
    }
  }
}

module.exports = { AutomodMemberAdd };
