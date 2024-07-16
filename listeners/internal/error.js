const { Listener } = require("@sapphire/framework");
const { ActivityType, EmbedBuilder, Colors } = require("discord.js");

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "error",
    });
  }
  async run(error) {
    if (require("../../config.json").process.botmode != "custom") {
      const embed = new EmbedBuilder()
        .setTitle("Caught error")
        .setDescription(`\`\`\`${error}\`\`\``)
        .setColor(Colors.Orange)
        .setTimestamp(new Date());

      const webhook = await webhookFetch.find("1258200184400252960");

      if (!webhook) {
        console.log("Welp didn't find a webhook, sry.");
        return;
      }

      await webhook
        .send({
          // content: '',
          username: this.container.client.user.username,
          avatarURL: this.container.client.user.displayAvatarURL({
            extension: "png",
            size: 512,
          }),
          embeds: [embed],
        })
        .catch((err) => console.error(`[error] Error on sending webhook`, err));
    }
  }
}
module.exports = {
  ReadyListener,
};
