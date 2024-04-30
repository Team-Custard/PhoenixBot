const { Message, GuildMember } = require('discord.js');
/**
 * Parses text with placeholders
 * @param {String} text The text to be parsed by the parser.
 * @param {Message} message The message object to be used for part of the parser.
 * @param {GuildMember} member The member object to turn to mention.
 */
exports.parse = async (text, message, member) => {
    const parsed = await text.replace(/\{\{(.*?)\}\}/g, function(match, token) {
        switch (token) {
            case 'mention':{
                return `${member}`;
            }
            case 'username':{
                return `${member.user.username}`;
            }
            case 'userid':{
                return `${member.user.id}`;
            }
            case 'membercount':{
                return `${message.guild.memberCount}`;
            }
            case 'servername':{
                return `${message.guild.name}`;
            }
            default:{
                return match;
            }
        }
    });
    return parsed;
};