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
at `/dash` (source in `frontend/src`, built output committed in `frontend/dist`).

- Log in with Discord. Sessions are random tokens in an HttpOnly, SameSite cookie,
  stored hashed in MongoDB with a 7-day expiry. The old version matched logins by IP
  address plus hostname, so people sharing an IP could end up in each other's session.
- Changes need the Manage Server permission in that server, checked on every request
  against the user's live server list. They also need a custom request header,
  which protects against CSRF.
- Pages: General, Bot profile, Moderation, Cases, Logging, Join gate, Automod,
  Discord AutoMod, Welcome & goodbye, Verification, Role menus, Embeds, Starboard,
  Leveling, Levels and Tags.
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

## Part two: dashboard fixes, automod and the new website

### Bugs fixed

- **Rank card background couldn't be uploaded.** The public API router parsed JSON
  for every request on the site, with a 100 KB limit, so uploads were rejected before
  the dashboard saw them. Images are now sent as raw bodies (up to 8 MB) and only the
  route that needs JSON parses it.
- **Prefix settings did nothing in test mode.** The prefix lookup returned the testing
  prefix before reading the server's settings, so turning prefixes on or off, or
  changing the prefix, had no effect. Each mode now has a default prefix (`=` prod,
  `==` dev, `===` test) and the server's own setting always wins. Note that dev and
  test share the staging collection, so a staging server that saved `==` answers to
  `==` in test mode too.

### Dashboard additions

- **Embeds:** the `/embed` builder on the web, with a live Discord-style preview
  (markdown, mentions, fields, images, footer, timestamp). Save, load, delete and send
  to a channel. Saved embeds are the same ones `/embed` loads.
- **Levels:** search everyone's level by name or user ID, edit level and XP, delete
  someone's level, give a level to someone new, or reset the whole server (type the
  server's name to confirm).
- **Bot profile:** change Phoenix's nickname and server avatar (PNG, JPEG, GIF or WebP)
  for one server. Server log webhooks now post with that name and avatar too
  (`webhookIdentity` in `tools/logging.js`). Discord doesn't allow "discord" or
  "clyde" in webhook names, so those fall back to the bot's normal name.
- **Join gate:** minimum account age and autokick moved here from the Automod page.

### Automod

- **Message filters** (`tools/automod.js`, `tools/automodRun.js`): spam, repeated
  messages, server invites (the server's own invites can be allowed), links (with an
  allow list), mass mentions, capital letters, blocked words (catches look-alike
  spellings like "h3ck", `*word*` matches inside words), emoji spam and walls of text.
  Each filter deletes the message and can also warn, mute, kick or ban, with a
  duration for mutes and bans. Edited messages are checked too.
- Moderators (Manage Messages, Kick, Ban or Moderate Members) are skipped unless
  turned off, people with Manage Server always are, and roles and channels or
  categories can be ignored. The same applies to Discord AutoMod punishments. Phoenix can post a short note
  saying why a message was removed, deleted after a few seconds.
- A member is punished at most once every 10 seconds, so a spam burst becomes one
  mute instead of six. Spam bursts are deleted as a whole.
- **Discord AutoMod:** link any of the server's AutoMod rules to a warn, mute, kick or
  ban (`listeners/automod/discordAutomod.js`). Discord blocks the message as usual and
  Phoenix adds the punishment. One rule break sends several events, so they're
  combined into one.
- Punishments made by automod and the punishment system share `tools/punish.js`:
  they open a case with Phoenix as the moderator, DM the member and post to the mod
  log, like a moderator's command would. `warn` uses the same punishment system code.
- Every automod action is logged to the Automod log channel.
- **Timed mutes with the mute role now end.** Mutes longer than Discord's 28-day
  timeout (or when Phoenix can't time someone out) use the mute role, which nothing
  used to remove. A new `tempMute` scheduled task takes it off and closes the case.
  This also fixes `/mod mute` with long durations; `/mod unmute` cancels the task.

### Website

The EJS website was replaced by a React site in the same app as the dashboard
(`frontend/`, formerly `dashboard/`). The dashboard's code is split into its own file,
so the public pages don't download it.

- **Home:** a new landing page with an animated pretend Discord channel showing
  leveling, automod, moderation, welcome messages and translation, plus live server,
  member and command counts.
- **Commands:** built from the loaded commands (`tools/commandCatalog.js`), so it's
  never out of date. Search, filter by category and copy usage. In dashboard-only mode
  the website reads `data/commands.json`, which the bot writes when it starts.
- **Public leaderboards:** `/leaderboard/<server id>` shows the top 100 with a podium.
  It's public for servers with leveling turned on, unless they turn it off
  (Leveling → Public leaderboard). Unknown server ids are answered from the database
  without asking Discord, and visitors are rate limited. `/leveling leaderboard`
  now shows the top 5 and links to the page, or the old paged embeds when the
  leaderboard is private.
- **UserDB profiles** (`/u/<id>`) with a live clock in the person's time zone, the
  time zone finder, the API docs (with a tester), terms, privacy policy, the invite
  success page and a 404 page.
- New public API routes in `routers/public.js`: `/api/public/stats`,
  `/api/public/commands`, `/api/public/leaderboard/:id` and `/api/public/userdb/:id`.
  The existing UserDB API routes are unchanged.
- Removed: `views/`, `routers/userdb.js`, and the `ejs`, `bootstrap`,
  `bootstrap-select` and `jquery` packages. The API page's clicker easter egg was not
  carried over (it's in the git history).

### Deploying part two

1. `npm install` (four packages were removed).
2. In the Discord developer portal nothing new needs turning on: the AutoMod
   intent isn't privileged. Phoenix needs the **Manage Server** permission in a
   server to see its AutoMod rules and receive AutoMod events.
3. `npm run build:web` only if you change `frontend/src`. The built site is committed.
4. `npm test`, then restart the bot.

## Part three: placeholders, message features and the send queue

### Placeholders

One placeholder system (`tools/placeholders.js`) now covers welcome and goodbye
messages, level-up messages, tags, embeds, autoresponses, timed messages and sticky
messages. New placeholders: `{{avatar}}`, `{{serveravatar}}`, `{{servericon}}`,
`{{serverbanner}}`, `{{channel}}`, `{{channelname}}`, `{{date}}`, `{{time}}` and
`{{datetime}}`, alongside the old ones.

- `{{date}}` and `{{time}}` use Discord timestamps, so everyone sees their own time
  zone. In places Discord shows text as is (embed titles, author names, footers) they
  fall back to plain UTC.
- Image placeholders work in an embed's image, thumbnail and icon boxes. Text that
  gets too long once filled in is cut to Discord's limits instead of failing.
- Member placeholders are empty in timed and sticky messages, which aren't about
  anyone.
- The dashboard has a Placeholders button on every page that uses them. The embed
  editor highlights placeholders in its preview and shows the real images for image
  placeholders. The `/embed` builder in Discord keeps placeholder links when saving.

### New features

- **Autoresponses** (dashboard → Autoresponses, up to 100): reply when a message
  contains a phrase, a whole word, matches exactly, starts with it, or matches a regex.
  Each one waits 15 seconds per channel after it fires. They can reply or just post,
  be limited to channels, and have a saved embed. Regexes are checked when saved
  (refusing ones that are likely to be slow) and run in a separate thread with a
  100 ms limit (`tools/regexWorker.js`), so a bad regex can't freeze the bot. One
  that times out is turned off until the next restart. They don't answer prefix
  commands, messages automod is removing, or the honeypot channel.
- **Timed messages** (up to 25): posted every so often (5 minutes to 30 days), with an
  option to skip a round when nobody talked since the last one. Timers survive
  restarts (`tools/models/TimedState.js`).
- **Sticky messages** (one per channel, up to 25): when people talk, Phoenix deletes
  its old copy and posts it again, at most once per cooldown (5 seconds or more).
  Bots and webhooks don't count as talking, so two sticky bots can't loop. The last
  copy is remembered across restarts (`tools/models/StickyState.js`).
- **Tags with embeds:** tags can have a saved embed attached, and can be edited on
  the dashboard. Saved embeds that tags or messages use can't be deleted until they're
  removed from those (on the dashboard and in `/embed`).
- **Role XP multipliers** (Leveling page): if a member has several roles with
  multipliers, the biggest one counts. 0 stops them earning XP.
- **Bot banner and bio** on the Bot profile page, next to the nickname and avatar.
  Discord doesn't send the bio back, so the dashboard remembers what was last set.
- **Honeypot channel** (Automod page): anyone except moderators who posts there has
  the message deleted and is kicked, shadowbanned or banned, and it's logged. It can
  also delete their messages from the past hour (kicks become a quick ban and unban).
  A button posts a warning in the channel.
- **Join gate:** kick new members who still have Discord's default avatar.
- **Dashboard search:** a search bar at the top of every server page finds settings
  by name or description and jumps to them. Press `/` or Ctrl+K to use it. The
  sidebar is grouped into Setup, Moderation, Messages and Community.
- **Unused commands:** when the bot starts, cluster 0 removes slash commands and
  context menus Discord still has that no longer exist in the code
  (`listeners/internal/commandCleanup.js`). Guild-only commands are checked in the
  servers listed under `commandGuilds` in config.json.

### Send queue

Everything Phoenix posts on its own (logs, welcome and level-up messages, starboard,
automod notes, autoresponses, timed and sticky messages) goes through
`tools/queue.js`. It keeps the cluster under its share of Discord's global limit,
takes turns between channels so one busy server can't hold up the rest, keeps each
channel's messages in order, and drops the oldest waiting messages for a channel if
it falls far behind. Command replies don't use it, since people are waiting for them.

Server log entries for the same channel are grouped into one message (up to 10
embeds) for a moment, so a purge or a raid takes a handful of requests instead of
hundreds. If a grouped message fails, its entries are sent one by one. Logs can wait
in the queue much longer than other messages before anything is dropped. A warning is
logged if the bot ever hits Discord's global rate limit.

### Website

- The staging banner and staging logo are gone.
- The "your" clicker is back on the API page: click "your" in the VanityDB section.

### Deploying part three

`npm install` isn't needed (no new packages). Run `npm test`, then restart. New
collections (`stickystates`, `timedstates`) are created automatically.

## Things to check after deploying

- **Logging:** log a message edit and delete, a ban and a role change, and check
  they appear.
- **Moderation:** run `/mod warn` with a punishment system step configured, a
  temporary `/mod ban`, then `/mod unban`.
- **Dashboard:** log in, change a setting, and check that the bot uses it within a
  minute (Redis cache TTL).
- **Role menus:** post a role menu from the dashboard and pick a role.
- **Leveling:** chat with leveling on, then check `/leveling rank`, `/leveling leaderboard`
  and the leaderboard page it links to. Upload a rank card background.
- **Automod:** turn on the invite filter, post an invite from an account without
  Manage Messages, and check the message is deleted, the warning is logged and the
  case appears. Link a Discord AutoMod rule and trigger it.
- **Bot profile:** change Phoenix's nickname and avatar, then trigger a server log and
  check the webhook uses them.
- **Embeds:** save an embed on the dashboard and load it with `/embed`, then send one.
- **Website:** open the home page, commands and a leaderboard on a phone and a computer.
- **Placeholders:** add a tag with `{{mention}}`, `{{servericon}}` in an attached
  embed's thumbnail and `{{date}}`, and show it.
- **Autoresponses, timed and sticky messages:** add one of each in a test channel and
  check the 15 second autoresponse cooldown and that the sticky stays at the bottom.
- **Honeypot:** with a test account, post in the honeypot channel.
- **Startup:** look for the "[commands]" line saying which unused commands were removed.
