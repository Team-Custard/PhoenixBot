/**
 * Parses text with placeholders
 * @param {String} text The text to be parsed by the parser.
 * @param {GuildMember} member The member object used by the parser.
 */
exports.parse = async (text, member) => {
  const parsed = await text.replace(/\{\{(.*?)\}\}/g, function (match, token) {
    switch (token) {
      case "mention": {
        return `${member}`;
      }
      case "username": {
        return `${member.user.username}`;
      }
      case "userid": {
        return `${member.user.id}`;
      }
      case "membercount": {
        return `${member.guild.memberCount}`;
      }
      case "servername": {
        return `${member.guild.name}`;
      }
      default: {
        return match;
      }
    }
  });
  return parsed;
};
