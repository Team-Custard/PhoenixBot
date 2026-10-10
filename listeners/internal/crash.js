const { Listener } = require("@sapphire/framework");
const database = require("../../tools/database");
const { report } = require("../../tools/errorReporter");

class CrashListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      emitter: process,
      event: "uncaughtException",
    });
  }

  async run(error) {
    console.log(`----[ Begin stacktrace ]----`);
    console.error(error);
    console.log(`----[ End stacktrace ]----`);
    await report(
      `A crash occured on cluster ${this.container.client.cluster?.id ?? "?"}! The cluster will try to restart.`,
      error,
    ).catch(() => undefined);
    console.log(`[FATAL] An uncaught exception has occured. Phoenix has crashed. Attempting to perform a clean shutdown.`);
    await database.disconnect();
    await this.container.client.destroy().catch(() => console.log(`Error shutting down the bot.`));
    console.log(`Shutdown tasks succeeded.`);
    process.exit(1);
  }
}
module.exports = { CrashListener };
