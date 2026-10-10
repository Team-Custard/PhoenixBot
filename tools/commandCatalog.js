// The public command list on the website (/commands), built from the loaded
// commands so it never goes out of date. The bot also writes it to data/commands.json
// when it starts, for the website in dashboard-only mode (no commands loaded there).
const fs = require("fs");
const path = require("path");
const { container } = require("@sapphire/framework");
const { PermissionsBitField } = require("discord.js");

const CACHE_FILE = path.join(__dirname, "../data/commands.json");
const HIDDEN_CATEGORIES = new Set(["dev"]);

const CATEGORY_NAMES = {
  mod: "Moderation",
  utility: "Utility",
  fun: "Fun & leveling",
  config: "Settings",
  groups: "Groups",
};

function describeArgs(args = []) {
  return args
    .filter((a) => !(a.slash === false && a.prefix === false))
    .map((a) => ({
      name: a.name,
      type: a.type,
      required: Boolean(a.required),
      description: a.description ?? "",
      choices: a.choices?.map((c) => (typeof c === "object" ? c.name : String(c))) ?? undefined,
    }));
}

function permissionNames(bits) {
  if (!bits?.length && typeof bits !== "bigint") return [];
  try {
    return new PermissionsBitField(bits).toArray().map((p) => p.replace(/([a-z])([A-Z])/g, "$1 $2"));
  }
  catch {
    return [];
  }
}

/** Builds the catalog from the loaded commands, or null if none are loaded. */
function buildCatalog() {
  const store = container.stores?.get("commands");
  if (!store?.size) return null;
  const commands = [];
  for (const command of store.values()) {
    if (HIDDEN_CATEGORIES.has(command.category) || command.isSlashGroup) continue;
    const slash = typeof command.slashPath === "function" ? command.slashPath() : null;
    const entry = {
      name: command.name,
      description: command.description ?? "",
      category: command.category ?? "general",
      aliases: [...(command.aliases ?? [])],
      slash: slash ? `/${slash.join(" ")}` : null,
      prefixOnly: !slash,
      usage: typeof command.usage === "function" ? command.usage() : command.name,
      args: describeArgs(command.args),
      examples: command.examples ?? [],
      permissions: permissionNames(command.options?.suggestedUserPermissions),
      contextMenus: (command.contextMenus ?? []).map((m) => ({ name: m.name, type: m.type === 2 ? "user" : "message" })),
      subcommands: (command.subcommandDefs ?? []).map((sub) => {
        const subSlash = command.slashPath(sub.name);
        return {
          name: sub.name,
          description: sub.description ?? "",
          slash: subSlash ? `/${subSlash.join(" ")}` : null,
          usage: command.usage(sub.name),
          args: describeArgs(sub.args),
        };
      }),
    };
    commands.push(entry);
  }
  // Slash groups' own subcommands, e.g. /userdb set.
  for (const group of store.values()) {
    if (!group.isSlashGroup || !group.subcommandDefs?.length) continue;
    commands.push({
      name: group.name,
      description: group.description ?? "",
      category: "utility",
      aliases: [...(group.aliases ?? [])],
      slash: `/${group.name}`,
      prefixOnly: false,
      usage: group.usage(),
      args: [],
      examples: group.examples ?? [],
      permissions: [],
      contextMenus: [],
      subcommands: group.subcommandDefs.map((sub) => ({
        name: sub.name,
        description: sub.description ?? "",
        slash: sub.slash === false ? null : `/${group.name} ${sub.name}`,
        usage: group.usage(sub.name),
        args: describeArgs(sub.args),
      })),
    });
  }
  commands.sort((a, b) => a.name.localeCompare(b.name));
  const categories = [...new Set(commands.map((c) => c.category))]
    .map((id) => ({ id, name: CATEGORY_NAMES[id] ?? id[0].toUpperCase() + id.slice(1) }));
  return { generatedAt: Date.now(), categories, commands };
}

let memo = null;
/** The catalog: from the loaded commands, or the copy the bot saved. */
function getCatalog() {
  if (memo) return memo;
  const built = buildCatalog();
  if (built) {
    memo = built;
    return memo;
  }
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  }
  catch {
    return { generatedAt: null, categories: [], commands: [] };
  }
}

/** Saves the catalog for the website in dashboard-only mode. Called when the bot starts. */
function saveCatalog() {
  const built = buildCatalog();
  if (!built) return;
  memo = built;
  fs.promises
    .mkdir(path.dirname(CACHE_FILE), { recursive: true })
    .then(() => fs.promises.writeFile(CACHE_FILE, JSON.stringify(built)))
    .catch((err) => console.warn("[web] Couldn't save the command list", err.message));
}

module.exports = { getCatalog, saveCatalog, buildCatalog };
