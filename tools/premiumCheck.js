const { container } = require("@sapphire/framework");

// Run a check if a guild has an active Phoenix premium via Discord's app monetization.
module.exports = async function(guild) {
    if (require('../config.json').forcepremium == true) return true

    const entitlements = await container.client.application.entitlements.fetch({
      skus: [require("../config.json").premiumId],
      guild: guild.id
    });
    return ((entitlements?.first()?.guildId == guild.id) ? true : false);
};