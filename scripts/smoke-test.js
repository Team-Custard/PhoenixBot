// Loads every command, listener, precondition and interaction handler without logging
// in, then builds every slash command the bot would register. Catches syntax errors,
// broken requires and invalid slash command definitions before deploying.
//
//   npm test
//
// Needs config.json to exist, but no tokens or database connection.
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
process.chdir(root);

const { SapphireClient, container } = require("@sapphire/framework");
const { GatewayIntentBits } = require("discord.js");

let failures = 0;
const fail = (what, err) => {
  failures++;
  console.error(`✗ ${what}\n  ${err?.stack ?? err}`);
};

async function main() {
  // Plain require of every JS file catches syntax errors and missing modules,
  // including folders Sapphire doesn't load here (scheduled tasks, routers).
  const folders = ["commands", "listeners", "preconditions", "interaction-handlers", "scheduled-tasks", "tools", "routers", "web"];
  const files = ["index.js", "bot.js", "server.js", "custombot.js"].map((f) => path.join(root, f));
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js")) files.push(full);
    }
  };
  for (const folder of folders) walk(path.join(root, folder));

  const entryPoints = new Set(
    ["index.js", "bot.js", "server.js", "custombot.js", "tools/PhoenixClient.js"].map((f) => path.join(root, f)),
  );
  for (const file of files) {
    if (entryPoints.has(file)) {
      // Entry points start things when required; only check that they parse.
      try {
        new Function(fs.readFileSync(file, "utf8").replace(/^#!.*/, ""));
      }
      catch (err) {
        fail(`parse ${path.relative(root, file)}`, err);
      }
      continue;
    }
    if (file.includes(`${path.sep}scheduled-tasks${path.sep}`)) continue;
    try {
      require(file);
    }
    catch (err) {
      fail(`require ${path.relative(root, file)}`, err);
    }
  }

  const client = new SapphireClient({
    intents: [GatewayIntentBits.Guilds],
    baseUserDirectory: root,
    loadMessageCommandListeners: true,
  });

  // SapphireClient only registers the user directory inside login().
  client.stores.registerPath(root);
  for (const store of client.stores.values()) {
    try {
      await store.loadAll();
    }
    catch (err) {
      fail(`load store ${store.name}`, err);
    }
  }

  const commands = container.stores.get("commands");
  console.log(`Loaded ${commands.size} commands, ${container.stores.get("listeners").size} listeners.`);

  // Two commands claiming the same name or alias means one silently wins.
  const claimed = new Map();
  for (const command of commands.values()) {
    for (const name of [command.name, ...command.aliases]) {
      const key = name.toLowerCase();
      if (claimed.has(key) && claimed.get(key) !== command.name) {
        fail(`prefix name "${name}"`, `used by both ${claimed.get(key)} and ${command.name}`);
      }
      claimed.set(key, command.name);
    }
  }

  const slash = new Map();
  const registered = new Set();
  for (const command of commands.values()) {
    if (!command.registerApplicationCommands) continue;
    try {
      await command.registerApplicationCommands(command.applicationCommandRegistry);
      for (const call of command.applicationCommandRegistry["apiCalls"]) {
        const data = call.builtData;
        const key = `${data.type ?? 1}:${data.name}`;
        if (slash.has(key)) throw new Error(`Duplicate application command name "${data.name}"`);
        slash.set(key, data);
        registered.add(command.name);
      }
    }
    catch (err) {
      fail(`register slash command for ${command.name}`, err);
    }
  }

  const tree = [...slash.values()]
    .filter((d) => (d.type ?? 1) === 1)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => {
      const subs = (d.options ?? []).filter((o) => o.type === 1 || o.type === 2).map((o) => o.name);
      return `/${d.name}${subs.length ? ` (${subs.join(", ")})` : ""}`;
    });
  console.log(`Slash commands (${tree.length}):\n  ${tree.join("\n  ")}`);
  const menus = [...slash.values()].filter((d) => d.type === 2 || d.type === 3).map((d) => d.name);
  if (menus.length) console.log(`Context menus: ${menus.join(", ")}`);

  const prefixOnly = [...commands.values()]
    .filter((c) => c.messageRun && !registered.has(c.name) && !c.slash?.group)
    .map((c) => c.name);
  console.log(`Prefix-only commands: ${prefixOnly.join(", ") || "none"}`);

  // The website's command list is built from the same commands.
  try {
    const catalog = require("../tools/commandCatalog").buildCatalog();
    if (!catalog?.commands.length) throw new Error("The command list for the website is empty.");
    JSON.stringify(catalog);
    console.log(`Website command list: ${catalog.commands.length} commands in ${catalog.categories.length} categories.`);
  }
  catch (err) {
    fail("website command list", err);
  }

  // The built website must exist, since server.js serves it as is.
  if (!fs.existsSync(path.join(root, "frontend/dist/index.html"))) {
    fail("website build", "frontend/dist/index.html is missing. Run `npm run build:web`.");
  }

  if (failures) {
    console.error(`\n${failures} problem(s) found.`);
    process.exit(1);
  }
  console.log("\nAll good.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
