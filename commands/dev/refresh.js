const { Command, CommandStore, ListenerStore, PreconditionStore, InteractionHandlerStore } = require("@sapphire/framework");
const { Colors } = require("discord.js");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "refresh",
      aliases: ["reload"],
      description:
        "Refreshes a store. This allows applying modifications to commands and handlers without restarting the bot.",
      detailedDescription: {
        usage: "refresh [storeItem]",
        examples: ["refresh echo", "refresh guildMemberAdd"],
        args: ["storeItem: The item to refresh. If none, refreshes everything. Only works for commands."],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["devCommand"],
    });
  }

  async messageRun(message, args) {
    const code = await args.pick("string").catch(() => undefined);

    if (code) {
        const piece = this.container.client.stores.get('commands').resolve(code);
        if (!piece) return message.reply(`:x: Command not found.`);
        await piece.reload().then(() => message.reply(`:white_check_mark: Successfully reloaded \`${piece.name}\`.`))
        .catch((err) => {
            message.reply(`:x: Command refresh failed, ${err}`);
            console.error(err);
        })
    }
    else {
        const accepted = await require(`../../tools/warningEmbed`).warnMessage(message, `You're about to refresh the entire stores. Continue?`);
        if (!accepted) return;
        const msg = await message.reply(`<a:load:1253195468830146703> **Refreshing bot stores...**`);
        await this.container.client.stores.get('listeners').loadAll();
        await this.container.client.stores.get('preconditions').loadAll();
        await this.container.client.stores.get('commands').loadAll();
        await this.container.client.stores.get('interaction-handlers').loadAll();
        msg.edit(`:white_check_mark: Reloaded bot stores successfully.`);
    }
  }
}
module.exports = {
  PingCommand,
};
