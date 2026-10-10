const LevelMember = require("./models/LevelMember");
const xpForLevel = require("./xpToLevel");

/** 1-based leaderboard position of a member (by level, then xp). */
async function getRank(guildId, entry) {
  const ahead = await LevelMember.countDocuments({
    guildId,
    $or: [{ level: { $gt: entry.level } }, { level: entry.level, xp: { $gt: entry.xp } }],
  });
  return ahead + 1;
}

/** A page of the leaderboard, best first. */
function getLeaderboard(guildId, { skip = 0, limit = 10 } = {}) {
  return LevelMember.find({ guildId }).sort({ level: -1, xp: -1 }).skip(skip).limit(limit).lean();
}

/**
 * Works out which level reward roles a member should gain/lose at a level.
 * @param {object} levelingSettings settings.leveling
 * @param {import("discord.js").GuildMember} member
 * @param {number} level
 */
function rewardRoleChanges(levelingSettings, member, level) {
  const rewards = (levelingSettings?.levelRoles ?? []).filter((r) => r.roleId);
  if (rewards.length === 0) return { add: [], remove: [] };
  const has = (id) => member.roles.cache.has(id);
  const eligible = rewards
    .filter((r) => level >= Number(r.level))
    .sort((a, b) => Number(b.level) - Number(a.level));

  if (levelingSettings.stackRoles !== false) {
    return { add: eligible.map((r) => r.roleId).filter((id) => !has(id)), remove: [] };
  }
  // Not stacking: only keep the highest reward the member qualifies for.
  const top = eligible[0]?.roleId;
  return {
    add: top && !has(top) ? [top] : [],
    remove: rewards.map((r) => r.roleId).filter((id) => id !== top && has(id)),
  };
}

module.exports = { LevelMember, xpForLevel, getRank, getLeaderboard, rewardRoleChanges };
