const { Listener } = require("@sapphire/framework");
const webhookFetch = require("../../tools/webhookFetch");

class GuildDelete extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildDelete" });
  }

  async run(guild) {
    console.log(`Left guild ${guild.name} (${guild.id})`);

    if (require("../../config.json").process.infowebhook && process.env.infwebhookid) {
      await webhookFetch.send(process.env.infwebhookid, {
        username: this.container.client.user.username,
        avatarURL: this.container.client.user.displayAvatarURL({ size: 512, extension: "png" }),
        content: `Removed from guild **${guild.name}** (\`${guild.id}\`).`,
      });
    }

    // Drop pending scheduled tasks (temp bans, autokicks) for the guild we left.
    const jobs = await this.container.tasks
      .list({ types: ["delayed", "waiting", "prioritized"] })
      .catch(() => []);
    await Promise.all(
      jobs
        .filter((job) => job?.data?.guildid == guild.id)
        .map((job) => job.remove().catch(() => undefined)),
    );
  }
}
module.exports = { GuildDelete };
