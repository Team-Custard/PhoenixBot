const { ScheduledTask } = require("@sapphire/plugin-scheduled-tasks");
const { getSettings } = require("../tools/guildSettings");
const { emoji } = require("../tools/errorReporter");
const mod = require("../tools/moderation");

// Kicks a member that didn't get their role in time (automod "autokick").
class AutoKickTask extends ScheduledTask {
  constructor(context, options) {
    super(context, { ...options, name: "autoKick" });
  }

  async run(payload) {
    const guild = await this.container.client.guilds.fetch(payload?.guildid).catch(() => undefined);
    if (!guild) return console.log(`Error processing autokick: No guild found`);
    const member = await guild.members.fetch(payload?.memberid).catch(() => undefined);
    if (!member) return undefined;

    const settings = await getSettings(guild.id);
    const neededRole = settings.automod?.autokick?.neededRole;
    if (neededRole && member.roles.cache.has(neededRole)) return undefined;
    // @everyone counts as one role.
    if (!neededRole && member.roles.cache.size > 1) return undefined;

    const reason = "Automod action for not getting a role on time";
    await member
      .send(`${emoji("warning")} You have been automatically kicked from **${guild.name}** for not getting your role on time.`)
      .catch(() => undefined);
    try {
      await member.kick(reason);
    }
    catch (err) {
      return console.log(`Automatic autokick failed: ${err}`);
    }
    console.log(`Successfully processed autokick`);
    await mod.sendAutomodLog(guild, settings, { title: "Kick (Automatic)", memberId: member.id, reason });
  }
}

module.exports = { AutoKickTask };
