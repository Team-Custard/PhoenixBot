const { container } = require("@sapphire/framework");
const { MessageFlags } = require("discord.js");
const { prefixDeprecation } = require("./config");

// When a user last saw the "prefix commands are going away" notice.
const lastDeprecationNotice = new Map();

/**
 * A thin wrapper around either a prefix-command Message or a slash-command
 * interaction, so a command can be written once and work for both.
 */
class CommandContext {
  /**
   * @param {import("./PhoenixCommand").PhoenixCommand} command
   * @param {object} source
   * @param {import("discord.js").Message} [source.message]
   * @param {import("discord.js").ChatInputCommandInteraction} [source.interaction]
   * @param {string} [source.subcommand]
   * @param {string} [source.invokedName]
   */
  constructor(command, { message, interaction, subcommand, invokedName }) {
    this.command = command;
    /** The name or alias the command was called with (prefix commands). */
    this.invokedName = invokedName ?? command.name;
    this.message = message ?? null;
    this.interaction = interaction ?? null;
    this.subcommand = subcommand ?? null;
    this._replied = false;
    this._noticeShown = false;
  }

  get isSlash() {
    return this.interaction !== null;
  }

  get source() {
    return this.interaction ?? this.message;
  }

  get client() {
    return container.client;
  }

  /** @returns {import("discord.js").Guild|null} */
  get guild() {
    return this.source.guild;
  }

  get channel() {
    return this.source.channel;
  }

  /** @returns {import("discord.js").GuildMember|null} */
  get member() {
    return this.source.member;
  }

  /** @returns {import("discord.js").User} */
  get user() {
    return this.isSlash ? this.interaction.user : this.message.author;
  }

  get locale() {
    return this.isSlash ? this.interaction.locale : this.guild?.preferredLocale ?? "en-US";
  }

  /**
   * Acknowledge a slow command. Slash commands get a "thinking..." state, prefix
   * commands get a typing indicator.
   * @param {object} [options]
   * @param {boolean} [options.ephemeral]
   */
  async defer({ ephemeral = false } = {}) {
    if (this.isSlash) {
      if (!this.interaction.deferred && !this.interaction.replied) {
        await this.interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : {});
      }
      return;
    }
    await this.message.channel.sendTyping().catch(() => undefined);
  }

  /**
   * Replies to the command. The first call answers the interaction (or replies to
   * the message); later calls send follow-ups.
   * @param {string|import("discord.js").MessageReplyOptions & import("discord.js").InteractionReplyOptions} payload
   * @returns {Promise<import("discord.js").Message>}
   */
  async reply(payload) {
    const options = normalize(payload);
    if (this.isSlash) {
      const { ephemeral, ...rest } = options;
      const withFlags = ephemeral ? { ...rest, flags: MessageFlags.Ephemeral } : rest;
      const interaction = this.interaction;
      if (!interaction.deferred && !interaction.replied) {
        this._replied = true;
        const response = await interaction.reply({ ...withFlags, withResponse: true });
        return response?.resource?.message ?? interaction.fetchReply().catch(() => undefined);
      }
      if (interaction.deferred && !this._replied) {
        this._replied = true;
        return interaction.editReply(rest);
      }
      return interaction.followUp(withFlags);
    }

    // eslint-disable-next-line no-unused-vars
    const { ephemeral, ...rest } = options;
    const withNotice = this._appendDeprecationNotice(rest);
    if (!this._replied) {
      this._replied = true;
      return this.message.reply(withNotice);
    }
    return this.message.channel.send(withNotice);
  }

  /** Edits the first reply (slash) — for prefix commands, pass the message returned by reply(). */
  async editReply(payload, sentMessage) {
    const options = normalize(payload);
    // eslint-disable-next-line no-unused-vars
    const { ephemeral, ...rest } = options;
    if (this.isSlash) return this.interaction.editReply(rest);
    return sentMessage?.edit(rest);
  }

  /** Sends an error reply (ephemeral for slash commands). */
  error(text) {
    return this.reply({ content: text, ephemeral: true, allowedMentions: { parse: [] } });
  }

  /** The slash command a prefix user should switch to, e.g. "</mod ban:123>". */
  slashMention() {
    const parts = this.command.slashPath(this.subcommand);
    return parts ? commandMention(parts.join(" ")) : null;
  }

  _appendDeprecationNotice(options) {
    if (!prefixDeprecation.notice || this._noticeShown) return options;
    const now = Date.now();
    const last = lastDeprecationNotice.get(this.user.id) ?? 0;
    if (now - last < prefixDeprecation.cooldownHours * 60 * 60 * 1000) return options;
    const mention = this.slashMention();
    if (!mention) return options;
    if (lastDeprecationNotice.size > 50_000) lastDeprecationNotice.clear();
    lastDeprecationNotice.set(this.user.id, now);
    this._noticeShown = true;
    const notice = `-# Prefix commands are being phased out. Try ${mention} instead.`;
    const content = options.content ? `${options.content}\n${notice}` : notice;
    if (content.length > 2000) return options;
    return { ...options, content };
  }
}

/**
 * A clickable slash command mention like "</mod ban:123>", or "`/mod ban`" if the
 * command id isn't known.
 * @param {string} path e.g. "mod ban"
 */
function commandMention(path) {
  const app = container.client?.application?.commands.cache.find((c) => c.name === path.split(" ")[0]);
  return app ? `</${path}:${app.id}>` : `\`/${path}\``;
}

function normalize(payload) {
  if (typeof payload === "string") return { content: payload };
  return { ...payload };
}

module.exports = { CommandContext, commandMention };
