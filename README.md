# PhoenixBot

A Discord bot by SylveonDev / Team Custard: moderation, automod, logging, welcome
messages, verification, leveling, role menus, embeds, tags, translation and UserDB
profiles, with a website and a web dashboard for server settings.

Built on [Sapphire](https://www.sapphirejs.dev/) (discord.js 14), MongoDB with a
Redis query cache, BullMQ for scheduled tasks and discord-hybrid-sharding.

## Running it

1. Install Node.js 20 or newer.
2. `npm install`
3. Copy `example.config.json` to `config.json` and `example.env` to `.env`, then fill them in.
4. First time after updating from an older version: `npm run migrate` (see [docs/FARROW.md](docs/FARROW.md)).
5. `npm start`

| Script | What it does |
| --- | --- |
| `npm start` | Starts the bot (and the dashboard on cluster 0 if `process.dashboard` is on). |
| `npm run dev` | Same, restarting on file changes (nodemon). |
| `npm test` | Loads every command/listener and builds every slash command without logging in. Run before deploying. |
| `npm run lint` | ESLint. `npm run lint:fix` fixes formatting. |
| `npm run migrate` | Moves cases and levels into their own collections. `-- --dry-run` to preview. |
| `npm run build:web` | Rebuilds the React website and dashboard into `frontend/dist`. |
| `npm run dev:web` | Rebuilds the website on every change while you work on it. |

The built website (`frontend/dist`) is committed, so a `git pull` on the server is
enough to deploy; only rebuild it when you change `frontend/src`.

## Layout

```
commands/          Slash + prefix commands, one file each (see "Writing a command")
  groups/          Slash command groups: /mod, /utilities, /userdb, /stats
listeners/         Event listeners (logging, automod, welcomer, starboard, leveling...)
interaction-handlers/  Buttons, select menus, modals, autocomplete
preconditions/     Permission checks (module = per-server disable/override rules)
scheduled-tasks/   Temp-ban expiry and autokick (BullMQ)
tools/             Shared code
  PhoenixCommand.js    Base class for commands that work as slash and prefix
  CommandContext.js    One reply/defer API over messages and interactions
  SlashGroup.js        Builds /mod etc. from the commands that join them
  moderation.js        Hierarchy checks, cases, mod-log, DM notices
  punish.js            Punishments Phoenix gives by itself (automod, punishment system)
  automod.js           Automod filters; automodRun.js acts on them
  commandCatalog.js    The command list shown on the website
  logging.js           Server log helper used by listeners/logging
  models/              Case, LevelMember, Counter (Mongoose)
web/               Dashboard backend: OAuth sessions, settings API, settings spec
frontend/          Website and dashboard (React, built with esbuild)
  src/site/          Public pages: home, commands, leaderboards, UserDB profiles...
  src/pages/         Dashboard pages
routers/           Public API (public.js for the website, api.js for UserDB) and short links
scripts/           smoke-test.js, migrate-v2.js
```

## Writing a command

Commands extend `PhoenixCommand`. Declare the arguments once and the same code serves
`/slash` and prefix usage:

```js
const { PhoenixCommand } = require("../../tools/PhoenixCommand");

class HugCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "hug",
      description: "Hugs someone.",
      args: [
        { name: "member", type: "member", required: true, description: "Who to hug" },
        { name: "message", type: "string", rest: true, description: "Something to say" },
        { name: "silent", type: "boolean", aliases: ["s"], description: "Don't ping them" },
      ],
      slash: { group: "utilities" }, // or omit for a top-level /hug, or false for prefix-only
      guildOnly: true,
    });
  }

  async run(ctx, { member, message, silent }) {
    return ctx.reply(`${ctx.user} hugs ${silent ? member.displayName : member}! ${message ?? ""}`);
  }
}

module.exports = { HugCommand };
```

- Arg types: `string`, `integer`, `number`, `boolean` (a `--flag` for prefix), `user`,
  `member`, `channel`, `role`, `duration` (`10m`, `2h`, `7d`) and `attachment`.
- Use `subcommands: [{ name, description, args, run: "methodName" }]` for `/tag add`-style commands.
- `ctx.reply()`, `ctx.defer()`, `ctx.error()` work the same for both kinds of command.
  Prefix replies occasionally include a note pointing people to the slash version
  (`prefixDeprecation` in config.json).
- Developer-only commands stay as plain Sapphire commands with `messageRun`.

## Website and dashboard

The public site (home, `/commands`, `/leaderboard/<server id>`, `/u/<user id>`, `/api`)
and the dashboard are one React app in `frontend/`. The website reads its data from
`routers/public.js`.

The dashboard is `/dash`. People log in with Discord and can change settings for
servers where they have Manage Server and the bot is present. Settings pages are drawn
from `web/spec.js`; to add a setting, add it to the schema in `tools/SettingsSchema.js`
and describe it in `web/spec.js`. The API validates against the same description.

The OAuth redirect URL `<dashboard.fullredirecturl>/dash/login` (or
`http://localhost:8080/dash/login` with `devmode`) must be added to the app's
OAuth2 redirects in the Discord developer portal.
