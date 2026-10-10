const { PermissionsBitField } = require("discord.js");
const { PhoenixCommand } = require("./PhoenixCommand");
const { emoji, report, userErrorMessage, replyToInteraction } = require("./errorReporter");

/**
 * Creates a slash command that groups other commands as subcommands, e.g. `/mod ban`.
 *
 * Member commands opt in with `slash: { group: "<name>" }` (see PhoenixCommand); the
 * group collects them automatically when slash commands are registered, so there is
 * no hand-written list of subcommands or options to keep in sync anymore.
 *
 * A group can also have its own `subcommands` (same format as PhoenixCommand), which
 * work as `/<group> <sub>` and as the prefix command `<group> <sub>`.
 *
 * @param {object} options
 * @param {string} options.name Slash command name.
 * @param {string} options.description
 * @param {bigint|number|null} [options.defaultMemberPermissions]
 * @param {import("discord.js").InteractionContextType[]} [options.contexts]
 * @param {import("discord.js").ApplicationIntegrationType[]} [options.integrationTypes]
 * @param {string[]} [options.idHints]
 * @param {import("./PhoenixCommand").SubcommandDefinition[]} [options.subcommands]
 * @param {string[]} [options.aliases] Prefix aliases for the group's own subcommands.
 */
function createSlashGroup(options) {
  return class SlashGroupCommand extends PhoenixCommand {
    constructor(context, pieceOptions) {
      super(context, {
        ...pieceOptions,
        name: options.name,
        aliases: options.aliases ?? [],
        description: options.description,
        subcommands: options.subcommands ?? null,
        // Members run their own checks; the group itself must not block DMs etc.
        guildOnly: false,
        slash: false,
      });
      this.isSlashGroup = true;
      this.groupOptions = options;
    }

    /** Commands that live under this group, in a stable order. */
    members() {
      return [...this.container.stores.get("commands").values()]
        .filter((command) => command.slash?.group === options.name)
        .sort((a, b) => a.slashName.localeCompare(b.slashName));
    }

    slashPath(subcommand) {
      return subcommand ? [options.name, subcommand] : null;
    }

    registerApplicationCommands(registry) {
      const own = (this.subcommandDefs ?? []).filter((s) => s.slash !== false);
      const members = this.members();
      const room = 25 - own.length;
      if (own.length + members.length === 0) return;
      if (members.length > room) {
        this.container.logger.warn(
          `[SlashGroup] /${options.name} has ${own.length + members.length} subcommands; Discord allows 25. Extra commands are skipped.`,
        );
      }

      registry.registerChatInputCommand(
        (builder) => {
          builder.setName(options.name).setDescription(options.description);
          for (const sub of own) {
            builder.addSubcommand((sc) => {
              sc.setName(sub.name).setDescription(sub.description.slice(0, 100));
              PhoenixCommand.applyOptions(sc, sub.args ?? []);
              return sc;
            });
          }
          for (const command of members.slice(0, room)) command.buildAsGroupMember(builder);
          if (options.defaultMemberPermissions !== undefined) {
            builder.setDefaultMemberPermissions(
              options.defaultMemberPermissions === null ? null : new PermissionsBitField(options.defaultMemberPermissions).bitfield,
            );
          }
          if (options.contexts) builder.setContexts(options.contexts);
          if (options.integrationTypes) builder.setIntegrationTypes(options.integrationTypes);
          return builder;
        },
        { idHints: options.idHints },
      );
    }

    async chatInputRun(interaction, context) {
      const group = interaction.options.getSubcommandGroup(false);
      const sub = interaction.options.getSubcommand(false);

      // The group's own subcommands.
      if (!group && this.subcommandDefs?.some((s) => s.name === sub)) {
        return super.chatInputRun(interaction, context);
      }

      const name = group ?? sub;
      const command = this.members().find((c) => c.slashName === name);
      if (!command) {
        return replyToInteraction(interaction, `${emoji("error")} That command isn't available right now.`);
      }

      // Run the member command's own checks (permissions, cooldowns, module toggles).
      const result = await command.preconditions.chatInputRun(interaction, command, context);
      if (result.isErr()) {
        const error = result.unwrapErr();
        return replyToInteraction(interaction, `${emoji("error")} ${error.message ?? error}`);
      }

      try {
        return await command.chatInputRun(interaction, context);
      }
      catch (error) {
        report(`Error occured while running the slash command /${options.name} ${name}`, error);
        return replyToInteraction(interaction, userErrorMessage(error));
      }
    }

    messageRun(message, args, context) {
      // Only the group's own subcommands exist as prefix commands under the group name.
      if (!this.subcommandDefs) return undefined;
      return super.messageRun(message, args, context);
    }
  };
}

module.exports = { createSlashGroup };
