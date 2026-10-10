const { Listener } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { cancelMemberTask } = require("../../tools/tasks");

// Jobs created before this process started may use the old random job ids.
const BOOT_TIME = Date.now();

// Cancels a pending autokick once the member gets the role they need.
class AutokickDisabler extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberUpdate", name: "automodAutokickDisabler" });
  }

  async run(oldMember, member) {
    // Only gaining roles can satisfy autokick. (If the old member wasn't cached we
    // can't tell what changed, so just check the current roles.)
    if (!oldMember.partial && member.roles.cache.size <= oldMember.roles.cache.size) return;

    const settings = await peekSettings(member.guild.id);
    const autokick = settings?.automod?.autokick;
    if (!autokick?.duration) return;

    const satisfied = autokick.neededRole ? member.roles.cache.has(autokick.neededRole) : member.roles.cache.size > 1;
    if (!satisfied) return;
    const joined = member.joinedTimestamp ?? 0;
    await cancelMemberTask("autoKick", member.guild.id, member.id, {
      // Only an old-style job could still be pending for this member.
      scanLegacy: joined < BOOT_TIME && Date.now() - joined < autokick.duration,
    });
  }
}

module.exports = { AutokickDisabler };
