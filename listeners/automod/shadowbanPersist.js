const { Listener } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");

// Re-applies the shadowban role when a shadowbanned member rejoins.
class ShadowbanPersist extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberAdd", name: "shadowbanPersist" });
  }

  async run(member) {
    const settings = await peekSettings(member.guild.id);
    const moderation = settings?.moderation;
    if (!moderation?.shadowBannedRole) return;
    if (!moderation.shadowbannedUsers?.some((m) => m.user === member.id)) return;
    await member.roles.set([moderation.shadowBannedRole], "Role persist").catch(() => undefined);
  }
}

module.exports = { ShadowbanPersist };
