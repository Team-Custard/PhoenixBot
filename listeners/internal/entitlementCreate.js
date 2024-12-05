const { Listener } = require("@sapphire/framework");
const { ActivityType, EmbedBuilder, Colors, Events, Entitlement } = require("discord.js");

const tempCache = [];

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: Events.EntitlementCreate,
    });
  }
  /**
   * @param {Entitlement} entitlement 
   */
  async run(entitlement) {
    if (tempCache.includes(entitlement.id)) return;
    tempCache.push(entitlement.id);
    console.log(`New entitlement: ${entitlement.id} for guild ${entitlement.guild.id}`);

    const user = (await entitlement.guild.fetchOwner()).user;
    const buyer = await entitlement.fetchUser();
    const embed = new EmbedBuilder()
    .setTitle(`<:plus:1262930849083559947> You've subscribed!`)
    .setDescription(`Hi there **${user.displayName}**, you are recieving this message because your server has been upgraded to Phoenix Plus. This was paid for by ${buyer}.`)
    .addFields([
        { name: `To reiterate:`, value: `Your server, **${entitlement.guild.name}**, is now plus. You can use every feature listed under our premium perks, such as auto translations, and custom bot responses.These features will last as long as the subscription is active and will be disabled once the subscription ends. You can configure the features on the dashboard.`},
        { name: `Any issues?`, value: `\nIf you encounter any problems, feel free to [join the support server](<https://discord.gg/PnUYnBbxER>) for assistance. We will try our best to assist you the best we can. Thank you, and we hope you enjoy your perks!`}
    ])
    .setTimestamp(new Date())
    .setThumbnail(`https://cdn.discordapp.com/emojis/1257980366094860369.png?size=512`)
    .setColor(Colors.Orange);
    user.send({ embeds: [embed] }).catch(console.error);
    
    tempCache.splice(tempCache.indexOf(entitlement.id), 1);
  }
}
module.exports = {
  ReadyListener,
};
