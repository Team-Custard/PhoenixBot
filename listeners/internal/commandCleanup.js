const { Listener, Events } = require("@sapphire/framework");
const { ApplicationCommandType } = require("discord.js");
const { settings } = require("../../tools/config");

const TYPE_NAMES = { [ApplicationCommandType.ChatInput]: "slash command", [ApplicationCommandType.User]: "user context menu", [ApplicationCommandType.Message]: "message context menu" };

/**
 * After Phoenix registers its commands on start, removes any slash commands and
 * context menus Discord still has that no longer exist in the code (old commands,
 * renamed ones, commands from another version of the bot). Global commands are
 * always checked; guild-only commands are checked in the servers listed under
 * "commandGuilds" in config.json, if any.
 */
class CommandCleanup extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "commandCleanup", event: Events.ApplicationCommandRegistriesRegistered, once: true });
  }

  async run() {
    const client = this.container.client;
    // Every cluster registers commands; only one needs to clean up.
    if (client.cluster && client.cluster.id !== 0) return;

    const expected = { global: new Set(), guilds: new Map() };
    for (const command of this.container.stores.get("commands").values()) {
      for (const call of command.applicationCommandRegistry?.["apiCalls"] ?? []) {
        const key = `${call.builtData.type ?? ApplicationCommandType.ChatInput}:${call.builtData.name}`;
        const guildIds = call.registerOptions?.guildIds ?? [];
        if (!guildIds.length) expected.global.add(key);
        for (const guildId of guildIds) {
          if (!expected.guilds.has(guildId)) expected.guilds.set(guildId, new Set());
          expected.guilds.get(guildId).add(key);
        }
      }
    }
    // Nothing loaded means something went wrong; don't wipe every command.
    if (!expected.global.size) return;

    const removed = [];
    const clean = async (manager, keep, where, guildId) => {
      const registered = await manager.fetch(guildId ? { guildId } : undefined).catch(() => null);
      if (!registered) return;
      for (const command of registered.values()) {
        if (keep.has(`${command.type}:${command.name}`)) continue;
        await command.delete().then(
          () => removed.push(`${TYPE_NAMES[command.type] ?? "command"} "${command.name}" (${where})`),
          (err) => console.warn(`[commands] Couldn't remove unused command ${command.name}: ${err.message}`),
        );
      }
    };

    await clean(client.application.commands, expected.global, "global");
    const guilds = new Set([...(settings.commandGuilds ?? []), ...expected.guilds.keys()]);
    for (const guildId of guilds) {
      await clean(client.application.commands, expected.guilds.get(guildId) ?? new Set(), `server ${guildId}`, guildId);
    }

    if (removed.length) this.container.logger.info(`[commands] Removed ${removed.length} unused command(s): ${removed.join(", ")}`);
    else this.container.logger.info("[commands] No unused slash commands or context menus found.");
  }
}

module.exports = { CommandCleanup };
