const { Listener } = require("@sapphire/framework");
const { ActivityType, EmbedBuilder, Colors } = require("discord.js");
const database = require("../../tools/database");

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      emitter: process,
      event: "uncaughtException",
    });
  }
  async run(error) {
    if (require("../../config.json").process.botmode != "custom") {
      const embed = new EmbedBuilder()
        .setTitle(`A crash occured on cluster \` ${this.container.client.cluster.id} \`!`)
        .setDescription(`The cluster will try to restart. If it doesn't start back up, notify a developer to restart the cluster manager.\n\`\`\`${error.stack}\`\`\``)
        .setColor(Colors.Orange)
        .setTimestamp(new Date());

      const webhook = await require('../../tools/webhookFetch').find(process.env["errwebhookid"]);

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
    console.log(`----[ Begin stacktrace ]----`);
    console.error(error);
    console.log(`----[ End stacktrace ]----`);
    console.log(`[FATAL] An uncaught exception has occured. Phoenix has crashed. Attempting to perform a clean shutdown.`);
    await database.disconnect();
    await this.container.client.destroy().catch(() => console.log(`Error shutting down the bot.`));
    console.log(`Shutdown tasks succeeded.`);
    process.exit(0);
  }
}
module.exports = {
  ReadyListener,
};
