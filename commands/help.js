const { EmbedBuilder, Colors, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const { PhoenixCommand } = require("../tools/PhoenixCommand");
const { emoji } = require("../tools/errorReporter");
const { commandMention } = require("../tools/CommandContext");
const { dashboard } = require("../tools/config");

const CATEGORIES = [
  ["utility", "Utility"],
  ["fun", "Fun"],
  ["mod", "Moderation"],
  ["config", "Settings"],
];

class HelpCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "help",
      aliases: ["h", "helpme"],
      description: "Lists the bot's commands, or shows details for one command.",
      examples: ["help", "help ban"],
      args: [
        { name: "command", type: "string", autocomplete: true, maxLength: 40, description: "The command to show help for" },
        { name: "dev", type: "boolean", aliases: ["d"], slash: false, description: "Include developer commands" },
      ],
      guildOnly: false,
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
    });
  }

  /** Commands worth listing (not slash groups, not dev-only unless asked). */
  listable(includeDev = false) {
    return [...this.container.stores.get("commands").values()].filter(
      (c) => (!c.isSlashGroup || c.subcommandDefs) && (includeDev || c.category !== "dev"),
    );
  }

  find(name) {
    const lower = name.toLowerCase().replace(/^\//, "");
    return this.listable(true).find(
      (c) => c.name === lower || c.aliases.includes(lower) || c.slashPath?.()?.join(" ") === lower || c.slashName === lower,
    );
  }

  async run(ctx, { command, dev }) {
    if (command) return this.showCommand(ctx, command);

    const byCategory = new Map(CATEGORIES.map(([key]) => [key, []]));
    for (const c of this.listable(dev)) {
      const key = byCategory.has(c.category) ? c.category : c.category === "dev" ? "dev" : "utility";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(`\`${c.name}\``);
    }

    const embed = new EmbedBuilder()
      .setTitle("All commands")
      .setDescription(
        `Every command works as a slash command. Prefix commands still work for now but are being phased out.\n` +
        `Use ${commandMention("help")} with a command name for details.` +
        (dashboard.baseUrl ? `\nServer settings now live on the [dashboard](${dashboard.baseUrl}/dash).` : ""),
      )
      .setColor(Colors.Orange)
      .setThumbnail(this.container.client.user.displayAvatarURL({ size: 512 }))
      .setTimestamp(new Date());

    for (const [key, label] of [...CATEGORIES, ["dev", "Developer"]]) {
      const names = byCategory.get(key);
      if (names?.length) embed.addFields({ name: label, value: names.sort().join(", ").slice(0, 1024) });
    }
    return ctx.reply({ embeds: [embed] });
  }

  showCommand(ctx, name) {
    const cmd = this.find(name);
    if (!cmd) return ctx.error(`${emoji("error")} No such command was found.`);

    const lines = [cmd.description || "No description."];
    if (typeof cmd.usage === "function") {
      lines.push("", `**Prefix:** \`${cmd.usage()}\``);
      const path = cmd.slashPath?.();
      if (path) lines.push(`**Slash:** ${commandMention(path.join(" "))}`);
      else if (cmd.slash === null) lines.push("**Slash:** prefix only");
    }

    const embed = new EmbedBuilder()
      .setTitle(`${cmd.name}${cmd.aliases.length ? ` - ${cmd.aliases.join(", ")}` : ""}`)
      .setDescription(lines.join("\n"))
      .setColor(Colors.Orange);

    if (cmd.subcommandDefs) {
      embed.addFields({
        name: "Subcommands",
        value: cmd.subcommandDefs
          .map((s) => `\`${cmd.usage(s.name)}\` - ${s.description}`)
          .join("\n")
          .slice(0, 1024),
      });
    }
    else if (cmd.args?.length) {
      embed.addFields({
        name: "Options",
        value: cmd.args
          .map((a) => `\`${a.type === "boolean" ? `--${a.name}` : a.name}\`${a.required ? " (required)" : ""} - ${a.description ?? ""}`)
          .join("\n")
          .slice(0, 1024),
      });
    }
    if (cmd.examples?.length) embed.addFields({ name: "Examples", value: cmd.examples.map((e) => `\`${e}\``).join("\n") });

    const userPerms = new PermissionsBitField(cmd.options.suggestedUserPermissions ?? []).toArray();
    const botPerms = new PermissionsBitField(cmd.options.requiredClientPermissions ?? []).toArray();
    embed.addFields({
      name: "Needed permissions",
      value: `User: ${userPerms.join(", ") || "None"}\nBot: ${botPerms.join(", ") || "None"}`,
    });
    return ctx.reply({ embeds: [embed] });
  }
}

module.exports = { HelpCommand };
