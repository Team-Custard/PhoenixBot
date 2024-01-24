exports.parse = async (text, member, guild) => {
    const splitText = text.slice().split("");
    // console.log(splitText);
    const newText = splitText.map((t) => {
        switch (t.toLowerCase()) {
            case '{{member}}': {
                return member.user.username.toString();
            }
            case '{{mention}}': {
                return (`<@${member.id}>`).toString();
            }
            case '{{memberid}}': {
                return member.id.toString();
            }
            case '{{membercount}}': {
                return guild.memberCount.toString();
            }
            case '{{guild}}': {
                return guild.name.toString();
            }
            case '{{guildid}}': {
                return guild.id.toString();
            }
            case '{{accountage}}': {
                return (`<t:${parseInt(`${member.user.createdTimestamp / 1000}`)}:R>`).toString();
            }
            default: {
                return t;
            }
        }
    });
    console.log(newText);
    return newText.join(" ");
};