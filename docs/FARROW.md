# Project Farrow: what changed

Branch `farrow/refactor`. Three goals: clean up the code and make it more efficient,
give every command a slash version on the way to retiring prefix commands, and move
server configuration from commands to the web dashboard.

## Deploying

1. Stop the bot.
2. `git checkout farrow/refactor`, then `npm install`. Unused packages were removed
   and `package-lock.json` was regenerated.
3. Back up the database, then run `npm run migrate -- --dry-run` to see what
   will move, followed by `npm run migrate`. Run it once for each bot mode you use
   (prod and dev/test use separate collections). See "Data changes" below.
4. In the Discord developer portal, make sure the dashboard app (`dashboard.clientid`)
   has `<fullredirecturl>/dash/login` as an OAuth2 redirect. Add
   `http://localhost:8080/dash/login` too if you use `devmode`.
5. Run `npm test` to load every command and build every slash command without logging in.
6. `npm start`. Slash commands are bulk-overwritten on start, which also removes
   the old config commands (`/welcomer`, `/logging`, ...) from Discord.

If anything goes wrong, `git checkout main` takes you back. The migration leaves
`cases`/`levelmembers` collections behind but `main` doesn't read them. To roll
back after migrating, restore the backup or run the migration with `--keep-old`
in the first place.

## Commands

All commands except developer commands now work as both slash and prefix commands,
from a single implementation (`tools/PhoenixCommand.js`). Previously most commands
had two copies of their logic, and 35 commands had no slash version.

New slash commands, which used to be prefix-only:

- `/mod kick`, `/mod mute`, `/mod unmute`, `/mod shadowban`, `/mod unshadowban`, and `/verify`
- `/utilities banner`, `/utilities ran`, `/utilities serveravatar`
- `/help`, with autocomplete, and `/dashboard`

Group membership is declared on each command (`slash: { group: "mod" }`), and
`/mod`, `/utilities`, `/userdb` and `/stats` build themselves from those commands.
There is no hand-written list of subcommands and options to keep in sync anymore.

The context menus "Translate message", "Translate message (DeepL)" and "Time for user"
are now normal registered commands, instead of being registered by hand with raw REST
calls on every start.

Prefix commands still work. Each user sees a small note at most once a day
pointing them to the slash version (`prefixDeprecation` in config.json). Servers can
turn prefix commands off completely on the dashboard (General → Prefix commands).

Smaller command changes:

- Server settings commands are gone: `welcomer`, `goodbye`, `logging`, `logignore`,
  `muterole`, `shadowbanrole`, `override`, `toggle`, `prefix`, `punishment-system`,
  `rolemenu`, `starboard`, `verification`, `autokick`, `minimumage` and `appeals-link`.
  Their names are now aliases of `dashboard`, so `=welcomer` replies with a link to
  the right dashboard page.
- `role whitelist`, `tag lock` and the leveling settings (`toggle`, `set_message`,
  `set_background`, `set_embeds`, `rewards`) moved to the dashboard.
  `leveling rank`, `leaderboard`, `set_level`, `clear` and the new `clear_all`
  (with a confirmation) stay as commands.
- `verify <member>` is a proper command for manually verifying someone. The old
  `verification verify` subcommand checked the manager role backwards and never worked.
- `/addemoji`: the separate `url` option was merged into `emoji`, which accepts either.
- `/userdb set` from a prefix command replies with a button that opens the form.
- `stats about` now counts servers across all clusters.

## Dashboard

The old dashboard was half-built and turned off. It has been replaced by a React app
at `/dash` (source in `dashboard/src`, built output committed in `dashboard/dist`).

- Log in with Discord. Sessions are random tokens in an HttpOnly, SameSite cookie,
  stored hashed in MongoDB with a 7-day expiry. The old version matched logins by IP
  address plus hostname, so people sharing an IP could end up in each other's session.
- Changes need the Manage Server permission in that server, checked on every request
  against the user's live server list. They also need a custom request header,
  which protects against CSRF.
- Pages: General, Moderation, Cases, Logging, Automod, Welcome & goodbye, Verification,
  Role menus, Starboard, Leveling and Tags.
- Settings are described once in `web/spec.js`. The API validates every value against
  that description: channels and roles must exist in the server, and roles the bot
  can't hand out are refused. The frontend draws its forms from the same description.
- Role menus and the verification panel are posted from the dashboard.
- Cases can be browsed and filtered, their reasons edited and warnings pardoned.
  The mod-log message is updated to match.
- The dashboard talks to Discord over REST, so it works for servers on every cluster
  and in dashboard-only mode.

## Data changes

Moderation cases (`infractions`) and leveling progress (`leveling.users`) used to be
arrays inside each server's settings document. Every settings read loaded all of them,
leveling rewrote the whole document on every message, and large servers would
eventually hit MongoDB's 16 MB document limit. Case numbers were `array length + 1`,
so two moderators acting at once could get the same number.

- `tools/models/Case.js`: one document per case. Case numbers come from an atomic
  counter (`tools/models/Counter.js`).
- `tools/models/LevelMember.js`: one document per member per server. XP is added with
  a single atomic update. Leaderboards and ranks are database queries, so the whole
  list is never loaded into memory.
- `scripts/migrate-v2.js` copies the data over. Cases that shared a number are
  renumbered after the highest one, and the script reports how many. It then removes
  the old arrays. It is safe to run more than once. On start, the bot logs a
  warning if any server still has old-style data.

## Efficiency

- **Logging webhooks:** every logged event called `fetchWebhooks()`, an API request.
  Webhooks are now cached per channel and refreshed only when a channel's webhooks
  change or a send fails.
- **Message edits:** the edit logger fetched every partial edited message from the API
  before checking whether logging was on. Link embeds loading count as edits, so this
  happened constantly.
- **Starboard:** it fetched the reaction and the message from the API for every
  reaction anywhere. Settings and the emoji are now checked first, and posted stars
  are remembered instead of searching the last 100 starboard messages each time.
- **Prefix lookup:** this ran an uncached database query on every message. It now
  reads two fields through the Redis cache.
- **Autokick:** every role change listed every pending job in Redis. Scheduled tasks
  now have predictable ids and are cancelled directly. Temp bans work the same way.
- **Leveling:** role rewards only call the API when a role actually needs adding or
  removing.
- **Dependencies:** removed packages that were unused or duplicated: `npm`,
  `install`, the package depending on itself, `sequelize`, `translate`,
  `text-language-detector`, `imgur`, `google-auth-library`, `node-reverse-image-search`,
  `os-utils`, `moment` (moment-timezone includes it), `discord-interactions`,
  `@discordjs/discord.js`, `@discordjs/rest`, `discord-api-types`, `@dbd-soft-ui/shards`,
  `body-parser`, `bent` and `node-fetch` (Node's built-in fetch replaces the last two).
- **Database debug logging:** MongoDB query logging is off in production (`MONGO_DEBUG`
  can turn it on).
- **Duplicated code:** the 17 near-identical error listeners, 14 log listeners and 9
  moderation commands now share helpers (`tools/errorReporter.js`, `tools/logging.js`,
  `tools/moderation.js`).

## Bugs fixed along the way

- **User updates:** `userUpdate` looped forever (`for (i = 0; guilds.size; i++)`), so
  every username or avatar change left a loop running every 500 ms until restart.
- **Verification:** with verification logs turned on, verifying crashed (undefined
  `member`/`webhookFetch`). It then told people the role couldn't be given, even after
  it had been given.
- **Disabled commands:** commands disabled in a server still ran, because the
  precondition was missing a `return`.
- **Leaving a server:** `guildDelete` crashed every time (it called `.find()` on a promise).
- **Staging check:** the "let the staging bot handle this server" check compared
  `client.id`, which doesn't exist, so it never applied. It now works and is cached.
- **Mod DMs:** messages to moderated members weren't awaited, so "User was not notified"
  was random, and kick DMs could arrive after the kick.
- **Website:** the HTTPS redirect and body parser were registered after the routes, so
  they never ran.
- **Embeds:** deleting a saved embed never saved.
- **UserDB:** the YouTube handle was checked against the Twitter field.
- **Durations:** bad durations on slash commands (like `/mod ban duration:soon`)
  silently became permanent. They're now rejected.
- **Server info:** `/server_info server:<id>` returned "not found" for servers that
  existed. The emoji limit for boost level 1 was also wrong.
- **User info:** the prefix version showed whether someone was banned to anyone, not
  just people with Ban Members.
- **AFK:** setting `afk` with a prefix command could clear it again straight away.
- **Leveling:** no-XP roles and channels and the XP rate settings existed but were
  ignored. They're now used.
- **Removed:** dead and broken files: the old EJS dashboard, `routers/interactions.js`,
  the disabled server-report handlers, `tools/tempPunishments.js`,
  `tools/InfractionSchema.js` and every `*.old` file.

## Things to check after deploying

- **Logging:** log a message edit and delete, a ban and a role change, and check
  they appear.
- **Moderation:** run `/mod warn` with a punishment system step configured, a
  temporary `/mod ban`, then `/mod unban`.
- **Dashboard:** log in, change a setting, and check that the bot uses it within a
  minute (Redis cache TTL).
- **Role menus:** post a role menu from the dashboard and pick a role.
- **Leveling:** chat with leveling on, then check `/leveling rank` and the dashboard
  leaderboard.
