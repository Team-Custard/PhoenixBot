const { Listener } = require("@sapphire/framework");
const { ActivityType } = require("discord.js");

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: true,
      event: "clientReady",
    });
  }
  /**
   *
   * @param {import("discord.js").Client} client
   */
  run(client) {
    if (require("../../config.json").process.botmode == "custom") {
      // const bots = JSON.parse(
      //   fs.readFileSync(require("../../custombot").list, "utf8"),
      // );

      // const foundToken = bots.find((b) => b.token == client.token);
      // if (!foundToken) {
      // }
      console.log(`[warning] Bot is running in custom mode, which is deprecated and will be removed in future versions.`);
    }
    else {
      const { username, id } = client.user;
      this.container.logger.info(
        `Bot client successfully started as ${username} (${id})`,
      );
      this.warnIfNotMigrated(client);
      client.user.setActivity({
        name: `/help || phoenix.sylveondev.xyz 🦊`,
        type: ActivityType.Custom,
      });
    }
  }
}
ReadyListener.prototype.warnIfNotMigrated = async function(client) {
  // Only one cluster needs to check.
  if (client.cluster?.id && client.cluster.id !== 0) return;
  const ServerSettings = require("../../tools/SettingsSchema");
  const legacy = await ServerSettings.collection
    .findOne({ $or: [{ "infractions.0": { $exists: true } }, { "leveling.users.0": { $exists: true } }] }, { projection: { _id: 1 } })
    .catch(() => null);
  if (legacy) {
    this.container.logger.warn(
      "[migration] Some servers still have cases/levels stored in their settings document. Run `npm run migrate` to move them; until then those old cases and levels won't show up.",
    );
  }
};

module.exports = {
  ReadyListener,
};