// Kept so older code keeps working; placeholders now live in tools/placeholders.js.
const { parse } = require("./placeholders");

/**
 * Fills placeholders in text for a member.
 * @param {string} text
 * @param {import("discord.js").GuildMember} member
 * @param {Record<string,string>} [extra] Extra values, like { level: "5" }.
 */
exports.parse = (text, member, extra = {}) => parse(text, member, extra);
