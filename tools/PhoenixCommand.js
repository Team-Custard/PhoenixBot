const { Command, CommandOptionsRunTypeEnum } = require("@sapphire/framework");
const { PermissionsBitField, InteractionContextType } = require("discord.js");
const { CommandContext } = require("./CommandContext");
const { emoji } = require("./errorReporter");
const { parseDuration } = require("./moderation");

/**
 * @typedef {object} ArgDefinition
 * @property {string} name Option name (lowercase, used for both slash and prefix).
 * @property {"string"|"integer"|"number"|"boolean"|"user"|"member"|"channel"|"role"|"duration"|"attachment"} type
 *   `boolean` args are --flags for prefix commands. `duration` accepts "5m", "2h", "7d"...
 * @property {string} [description]
 * @property {boolean} [required]
 * @property {boolean} [rest] Prefix only: consume the rest of the message (last string arg).
 * @property {string[]} [aliases] Prefix only: extra flag names, e.g. ["s"] for --silent / -s.
 * @property {Array<string|{name: string, value: string|number}>} [choices]
 * @property {boolean} [autocomplete]
 * @property {number} [minValue]
 * @property {number} [maxValue]
 * @property {number} [maxLength]
 * @property {import("discord.js").ChannelType[]} [channelTypes]
 * @property {*} [default] Value used when the arg is omitted.
 * @property {boolean} [slash] Set to false to hide this arg from the slash command.
 * @property {boolean} [prefix] Set to false to hide this arg from the prefix command.
 */

/**
 * @typedef {object} SubcommandDefinition
 * @property {string} name
 * @property {string} description
 * @property {ArgDefinition[]} [args]
 * @property {string|Function} run Method name on the command, or a function(ctx, args).
 * @property {string[]} [aliases] Prefix only.
 * @property {boolean} [default] Prefix only: used when no subcommand name is given.
 * @property {boolean} [slash] false = prefix only.
 * @property {boolean} [prefix] false = slash only.
 */

const SAPPHIRE_RESOLVER = {
  string: "string",
  integer: "integer",
  number: "number",
  user: "user",
  member: "member",
  channel: "guildChannel",
  role: "role",
};

/**
 * Base class for commands that work as both slash and prefix commands.
 *
 * Declare the arguments once with `args` (or `subcommands`), implement
 * `run(ctx, args)` (or one method per subcommand), and the class takes care of
 * registering the slash command, parsing prefix arguments and replying through
 * a common {@link CommandContext}.
 *
 * Slash placement:
 * - `slash: { group: "mod" }` exposes the command as `/mod <name>` (see tools/SlashGroup.js).
 * - `slash: { name: "ping" }` (or omitted) registers a top-level `/name`.
 * - `slash: false` keeps the command prefix-only (developer commands).
 *
 * Commands are server-only by default; pass `guildOnly: false` for commands that
 * also work in DMs and as a user-installed app (ctx.guild may then be null).
 */
class PhoenixCommand extends Command {
  constructor(context, options = {}) {
    const args = options.args ?? [];
    const subcommands = options.subcommands ?? null;
    const allArgs = [...args, ...(subcommands ?? []).flatMap((s) => s.args ?? [])];
    const flagNames = allArgs
      .filter((a) => a.type === "boolean" && a.prefix !== false)
      .flatMap((a) => [a.name, ...(a.aliases ?? [])]);

    const guildOnly = options.guildOnly ?? true;

    super(context, {
      ...options,
      flags: options.flags ?? (flagNames.length ? flagNames : undefined),
      runIn: options.runIn ?? (guildOnly ? CommandOptionsRunTypeEnum.GuildAny : undefined),
    });

    /** @type {ArgDefinition[]} */
    this.args = args;
    /** @type {SubcommandDefinition[]|null} */
    this.subcommandDefs = subcommands;
    this.slash = options.slash === false ? null : { ...(options.slash ?? {}) };
    this.guildOnly = guildOnly;
    this.examples = options.examples ?? options.detailedDescription?.examples ?? [];
    /**
     * Right click → Apps menu entries.
     * @type {Array<{ name: string, type: import("discord.js").ApplicationCommandType, run: string|Function,
     *   contexts?: import("discord.js").InteractionContextType[], integrationTypes?: import("discord.js").ApplicationIntegrationType[] }>}
     */
    this.contextMenus = options.contextMenus ?? [];
  }

  /** The name used for this command in the slash command tree. */
  get slashName() {
    return this.slash?.name ?? this.name;
  }

  /** e.g. ["mod", "ban"] or ["tag", "add"]; null for prefix-only commands. */
  slashPath(subcommand) {
    if (!this.slash) return null;
    const sub = subcommand ? this.subcommandDefs?.find((s) => s.name === subcommand) : null;
    if (sub && sub.slash === false) return null;
    const path = this.slash.group ? [this.slash.group, this.slashName] : [this.slashName];
    if (sub) path.push(sub.name);
    return path;
  }

  /** Human readable prefix usage, e.g. "ban <user> [duration] [reason] [--silent]". */
  usage(subcommand) {
    const sub = subcommand ? this.subcommandDefs?.find((s) => s.name === subcommand) : null;
    if (this.subcommandDefs && !sub) {
      return `${this.name} <${this.subcommandDefs.filter((s) => s.prefix !== false).map((s) => s.name).join("|")}>`;
    }
    const defs = (sub ? sub.args : this.args) ?? [];
    const parts = [this.name];
    if (sub) parts.push(sub.name);
    for (const arg of defs) {
      if (arg.prefix === false) continue;
      if (arg.type === "boolean") parts.push(`[--${arg.name}]`);
      else parts.push(arg.required ? `<${arg.name}>` : `[${arg.name}]`);
    }
    return parts.join(" ");
  }

  // ---------------------------------------------------------------------------
  // Slash command registration
  // ---------------------------------------------------------------------------

  registerApplicationCommands(registry) {
    for (const menu of this.contextMenus) {
      registry.registerContextMenuCommand((builder) => {
        builder.setName(menu.name).setType(menu.type);
        if (menu.contexts) builder.setContexts(menu.contexts);
        if (menu.integrationTypes) builder.setIntegrationTypes(menu.integrationTypes);
        return builder;
      });
    }
    if (!this.slash || this.slash.group) return;
    registry.registerChatInputCommand((builder) => this.buildSlashCommand(builder), {
      idHints: this.slash.idHints,
    });
  }

  /** Runs the handler of the context menu (right click → Apps) that was used. */
  async contextMenuRun(interaction) {
    const menu = this.contextMenus.find((m) => m.name === interaction.commandName);
    if (!menu) return undefined;
    const handler = typeof menu.run === "function" ? menu.run : this[menu.run];
    return handler.call(this, interaction);
  }

  buildSlashCommand(builder) {
    builder.setName(this.slashName).setDescription(truncate(this.description || this.name, 100));
    this.applySlashBody(builder);

    const perms = this.slash.defaultMemberPermissions ?? this.options.suggestedUserPermissions;
    if (perms) builder.setDefaultMemberPermissions(new PermissionsBitField(perms).bitfield);
    if (this.slash.contexts) builder.setContexts(this.slash.contexts);
    else if (this.guildOnly) builder.setContexts([InteractionContextType.Guild]);
    if (this.slash.integrationTypes) builder.setIntegrationTypes(this.slash.integrationTypes);
    return builder;
  }

  /** Adds this command as a subcommand (or subcommand group) of a slash group. */
  buildAsGroupMember(builder) {
    if (this.subcommandDefs) {
      builder.addSubcommandGroup((group) => {
        group.setName(this.slashName).setDescription(truncate(this.description || this.name, 100));
        this.applySlashBody(group);
        return group;
      });
    }
    else {
      builder.addSubcommand((sub) => {
        sub.setName(this.slashName).setDescription(truncate(this.description || this.name, 100));
        PhoenixCommand.applyOptions(sub, this.args);
        return sub;
      });
    }
    return builder;
  }

  applySlashBody(builder) {
    if (this.subcommandDefs) {
      for (const sub of this.subcommandDefs) {
        if (sub.slash === false) continue;
        builder.addSubcommand((sc) => {
          sc.setName(sub.name).setDescription(truncate(sub.description || sub.name, 100));
          PhoenixCommand.applyOptions(sc, sub.args ?? []);
          return sc;
        });
      }
    }
    else {
      PhoenixCommand.applyOptions(builder, this.args);
    }
  }

  /** Adds slash options for a list of arg definitions. Required options go first, as Discord requires. */
  static applyOptions(builder, defs) {
    const visible = defs.filter((a) => a.slash !== false);
    const ordered = [...visible.filter((a) => a.required), ...visible.filter((a) => !a.required)];
    for (const arg of ordered) {
      const base = (option) => {
        option
          .setName(arg.name)
          .setDescription(truncate(arg.description || arg.name, 100))
          .setRequired(Boolean(arg.required));
        if (arg.autocomplete) option.setAutocomplete(true);
        return option;
      };
      const choices = (arg.choices ?? []).map((c) => (typeof c === "object" ? c : { name: String(c), value: c }));
      switch (arg.type) {
        case "string":
        case "duration":
          builder.addStringOption((o) => {
            base(o);
            if (choices.length) o.addChoices(...choices);
            if (arg.maxLength) o.setMaxLength(arg.maxLength);
            return o;
          });
          break;
        case "integer":
          builder.addIntegerOption((o) => {
            base(o);
            if (choices.length) o.addChoices(...choices);
            if (arg.minValue !== undefined) o.setMinValue(arg.minValue);
            if (arg.maxValue !== undefined) o.setMaxValue(arg.maxValue);
            return o;
          });
          break;
        case "number":
          builder.addNumberOption((o) => {
            base(o);
            if (arg.minValue !== undefined) o.setMinValue(arg.minValue);
            if (arg.maxValue !== undefined) o.setMaxValue(arg.maxValue);
            return o;
          });
          break;
        case "boolean":
          builder.addBooleanOption(base);
          break;
        case "user":
        case "member":
          builder.addUserOption(base);
          break;
        case "channel":
          builder.addChannelOption((o) => {
            base(o);
            if (arg.channelTypes) o.addChannelTypes(...arg.channelTypes);
            return o;
          });
          break;
        case "role":
          builder.addRoleOption(base);
          break;
        case "attachment":
          builder.addAttachmentOption(base);
          break;
        default:
          throw new Error(`Unknown arg type "${arg.type}" for ${arg.name}`);
      }
    }
    return builder;
  }

  // ---------------------------------------------------------------------------
  // Running
  // ---------------------------------------------------------------------------

  async chatInputRun(interaction) {
    let sub = null;
    let defs = this.args;
    if (this.subcommandDefs) {
      const name = interaction.options.getSubcommand(false);
      sub = this.subcommandDefs.find((s) => s.name === name && s.slash !== false);
      if (!sub) return interaction.reply({ content: `${emoji("error")} Unknown subcommand.`, ephemeral: true });
      defs = sub.args ?? [];
    }

    const ctx = new CommandContext(this, { interaction, subcommand: sub?.name });
    const values = {};
    for (const arg of defs) {
      if (arg.slash === false) {
        values[arg.name] = arg.default ?? (arg.type === "boolean" ? false : null);
        continue;
      }
      const result = await readOption(interaction, arg);
      if (result.error) return ctx.error(`${emoji("error")} ${result.error}`);
      values[arg.name] = result.value;
    }
    return this.dispatch(ctx, values, sub);
  }

  async messageRun(message, args, context) {
    let sub = null;
    let defs = this.args;
    const prefix = context?.commandPrefix ?? "";

    if (this.subcommandDefs) {
      const peek = await args.peekResult("string");
      const token = peek.isOk() ? peek.unwrap().toLowerCase() : null;
      sub = this.subcommandDefs.find(
        (s) => s.prefix !== false && (s.name === token || s.aliases?.includes(token)),
      );
      if (sub) args.next();
      else sub = this.subcommandDefs.find((s) => s.default && s.prefix !== false);
      if (!sub) {
        const list = this.subcommandDefs
          .filter((s) => s.prefix !== false)
          .map((s) => `\`${s.name}\` - ${s.description}`)
          .join("\n");
        return message.reply(`${emoji("info")} **Usage:** \`${prefix}${this.usage()}\`\n${list}`);
      }
      defs = sub.args ?? [];
    }

    const ctx = new CommandContext(this, { message, subcommand: sub?.name, invokedName: context?.commandName });
    const values = {};
    for (const arg of defs) {
      if (arg.prefix === false) {
        values[arg.name] = arg.default ?? (arg.type === "boolean" ? false : null);
        continue;
      }
      const result = await readPrefixArg(message, args, arg);
      if (result.error) {
        return ctx.error(`${emoji("error")} ${result.error}\n**Usage:** \`${prefix}${this.usage(sub?.name)}\``);
      }
      values[arg.name] = result.value;
    }
    return this.dispatch(ctx, values, sub);
  }

  dispatch(ctx, values, sub) {
    if (sub) {
      const handler = typeof sub.run === "function" ? sub.run : this[sub.run];
      if (typeof handler !== "function") throw new Error(`Subcommand ${this.name} ${sub.name} has no handler`);
      return handler.call(this, ctx, values);
    }
    return this.run(ctx, values);
  }

  /**
   * Override this (or use subcommands).
   * @param {CommandContext} ctx
   * @param {Record<string, any>} args
   */
  // eslint-disable-next-line no-unused-vars
  async run(ctx, args) {
    throw new Error(`${this.name} does not implement run()`);
  }
}

async function readOption(interaction, arg) {
  const opts = interaction.options;
  const name = arg.name;
  let value;
  switch (arg.type) {
    case "string":
      value = opts.getString(name);
      break;
    case "duration": {
      const raw = opts.getString(name);
      if (raw) {
        value = parseDuration(raw);
        if (value === null) return { error: `\`${raw}\` isn't a valid duration. Try something like \`10m\`, \`2h\` or \`7d\`.` };
      }
      break;
    }
    case "integer":
      value = opts.getInteger(name);
      break;
    case "number":
      value = opts.getNumber(name);
      break;
    case "boolean":
      value = opts.getBoolean(name);
      break;
    case "user":
      value = opts.getUser(name);
      break;
    case "member": {
      value = opts.getMember(name);
      const user = opts.getUser(name);
      if ((!value || !value.roles?.highest) && user && interaction.guild) {
        value = await interaction.guild.members.fetch(user.id).catch(() => null);
      }
      if (user && !value) return { error: `**${user.tag}** isn't in this server.` };
      break;
    }
    case "channel":
      value = opts.getChannel(name);
      break;
    case "role":
      value = opts.getRole(name);
      break;
    case "attachment":
      value = opts.getAttachment(name);
      break;
  }
  if (value === null || value === undefined) {
    value = arg.default ?? (arg.type === "boolean" ? false : null);
  }
  return { value };
}

async function readPrefixArg(message, args, arg) {
  const missing = () =>
    arg.required ? { error: `Missing or invalid argument **${arg.name}**.` } : { value: arg.default ?? null };

  if (arg.type === "boolean") {
    return { value: args.getFlags(arg.name, ...(arg.aliases ?? [])) };
  }

  if (arg.type === "duration") {
    const peek = await args.peekResult("string");
    const duration = peek.isOk() ? parseDuration(peek.unwrap()) : null;
    if (duration === null) return missing();
    args.next();
    return { value: duration };
  }

  if (arg.type === "attachment") {
    const attachment = message.attachments.first() ?? null;
    return attachment ? { value: attachment } : missing();
  }

  if (arg.type === "member" && !message.guild) return { error: `This command can only be used in a server.` };

  const resolver = SAPPHIRE_RESOLVER[arg.type];
  const result = arg.rest ? await args.restResult(resolver) : await args.pickResult(resolver);
  if (result.isErr()) return missing();
  let value = result.unwrap();

  if (arg.choices) {
    const choices = arg.choices.map((c) => (typeof c === "object" ? c : { name: String(c), value: c }));
    const match = choices.find(
      (c) => String(c.value).toLowerCase() === String(value).toLowerCase() ||
        c.name.toLowerCase() === String(value).toLowerCase(),
    );
    if (!match) return { error: `**${arg.name}** must be one of: ${choices.map((c) => `\`${c.value}\``).join(", ")}.` };
    value = match.value;
  }
  if (arg.channelTypes && value && !arg.channelTypes.includes(value.type)) {
    return { error: `That channel type can't be used for **${arg.name}**.` };
  }
  if (typeof value === "number") {
    if (arg.minValue !== undefined && value < arg.minValue) return { error: `**${arg.name}** must be at least ${arg.minValue}.` };
    if (arg.maxValue !== undefined && value > arg.maxValue) return { error: `**${arg.name}** must be at most ${arg.maxValue}.` };
  }
  return { value };
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

module.exports = { PhoenixCommand };
