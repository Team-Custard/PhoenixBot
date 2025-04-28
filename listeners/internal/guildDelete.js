const { Listener } = require("@sapphire/framework");
const db = require("../../tools/database");
const fs = require('fs');

class GuildDelete extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildDelete",
    });
  }
  async run(guild) {
    if (require('../../config.json').process.infowebhook) {
              const channel = await this.container.client.channels.fetch(process.env["infwebhookid"])
              .catch(() => undefined);
              if (channel) {
                const webhook = await require('../../tools/webhookFetch').find(channel);
                if (webhook) webhook.send({
                  username: this.container.client.user.username,
                  avatarURL: this.container.client.user.displayAvatarURL({size: 512, extension: "png"}),
                  content: `Removed from guild **${guild.name}** (\`${guild.id}\`).`,
                }).then(() => console.log(`Webhook sent`))
                .catch(() => console.log(`Error while sending error webhook`));
              }
            }
    console.log(`Left guild ${guild.name} (${guild.id})`);

    const tasks = await this.container.tasks.list({types: ["delayed", "waiting", "prioritized"]}).find(t => t.data.guildid == guild.id)

    for (let i in tasks) {
      await tasks[i].remove();
    }
  }
}
module.exports = {
  GuildDelete,
};
