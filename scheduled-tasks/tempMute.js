const { ScheduledTask } = require("@sapphire/plugin-scheduled-tasks");
const { getSettings } = require("../tools/guildSettings");
const mod = require("../tools/moderation");

// Takes the mute role off again when a mute that couldn't use a Discord timeout (longer
// than 28 days, or Phoenix lacking Moderate Members) runs out.
class TempMuteTask extends ScheduledTask {
  constructor(context, options) {
    super(context, { ...options, name: "tempMute" });
  }

  async run(payload) {
    const guild = await this.container.client.guilds.fetch(payload.guildid).catch(() => undefined);
    if (!guild) return console.log(`Error processing unmute: No guild found`);

    const settings = await getSettings(guild.id);
    const role = payload.roleid ?? settings.moderation?.muteRole;
    const member = await guild.members.fetch(payload.memberid).catch(() => null);
    if (member && role && member.roles.cache.has(role)) {
      await member.roles.remove(role, "Automatic unmute: temporary mute expired");
    }

    const caseDoc = await mod.Case.findCase(guild.id, payload.caseid);
    if (caseDoc && !caseDoc.expired) {
      caseDoc.punishment = `${caseDoc.punishment} (expired)`;
      caseDoc.expired = true;
      await caseDoc.save();
      await mod.updateModlog(guild, settings, caseDoc);
    }
  }
}

module.exports = { TempMuteTask };
