const { ScheduledTask } = require("@sapphire/plugin-scheduled-tasks");
const { getSettings } = require("../tools/guildSettings");
const mod = require("../tools/moderation");

// Lifts a temporary ban when it expires.
class TempBanTask extends ScheduledTask {
  constructor(context, options) {
    super(context, { ...options, name: "tempBan" });
  }

  async run(payload) {
    const guild = await this.container.client.guilds.fetch(payload.guildid).catch(() => undefined);
    if (!guild) return console.log(`Error processing unban: No guild found`);

    try {
      await guild.bans.remove(payload.memberid, "Automatic unban: temporary ban expired");
      console.log(`Successfully processed unban`);
    }
    catch (err) {
      // 10026 = Unknown Ban: someone already unbanned them, but still close the case.
      if (err?.code !== 10026) throw err;
    }

    const caseDoc = await mod.Case.findCase(guild.id, payload.caseid);
    if (!caseDoc) return console.log(`Unbanned, but case ${payload.caseid} wasn't found to mark as expired.`);
    if (!caseDoc.expired) {
      caseDoc.punishment = `${caseDoc.punishment} (expired)`;
      caseDoc.expired = true;
      await caseDoc.save();
    }
    const settings = await getSettings(guild.id);
    await mod.updateModlog(guild, settings, caseDoc);
  }
}

module.exports = { TempBanTask };
