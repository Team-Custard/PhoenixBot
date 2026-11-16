// "Make one for me" on the Moderation page: creates a mute or shadowban role and
// sets its permissions in every channel, like the old `muterole --create` and
// `shadowbanrole --create` commands did. That can take a while on big servers, so it
// runs in the background and the dashboard polls for progress.
const { Routes, PermissionFlagsBits, ChannelType, Colors } = require("discord.js");
const discord = require("./discord");

const P = PermissionFlagsBits;

const KINDS = {
  mute: {
    setting: "muteRole",
    name: "Muted",
    color: 0x7f8c8d,
    deny: P.SendMessages | P.SendMessagesInThreads | P.CreatePublicThreads | P.CreatePrivateThreads | P.AddReactions | P.Speak | P.Connect | P.SendVoiceMessages,
  },
  shadowban: {
    setting: "shadowBannedRole",
    name: "Banished",
    color: Colors.DarkButNotBlack,
    deny: P.ViewChannel | P.SendMessages,
  },
};

/** guildId -> the running (or last) job. */
const jobs = new Map();
const CONCURRENCY = 4;

function status(guildId) {
  const job = jobs.get(guildId);
  if (!job) return null;
  const { kind, state, total, done, failed, roleId, channelId, error, finishedAt } = job;
  return { kind, state, total, done, failed, roleId, channelId, error, finishedAt };
}

/**
 * Starts making a role. `save(roleId)` stores it in the server's settings when done.
 * @returns {object} The job's status.
 */
function start(guildId, kind, { save, onDone }) {
  const spec = Object.hasOwn(KINDS, kind) ? KINDS[kind] : null;
  if (!spec) throw Object.assign(new Error("Unknown role kind."), { status: 400 });
  const running = jobs.get(guildId);
  if (running?.state === "running") throw Object.assign(new Error("Phoenix is already setting up a role for this server. Wait for it to finish."), { status: 409 });
  const job = { kind, state: "running", total: 0, done: 0, failed: 0, roleId: null, channelId: null, error: null, finishedAt: null };
  jobs.set(guildId, job);
  run(guildId, spec, kind, job, save)
    .then(() => {
      job.state = "done";
    })
    .catch((err) => {
      job.state = "failed";
      job.error = err.rawError?.message ?? err.message ?? String(err);
    })
    .finally(() => {
      job.finishedAt = Date.now();
      onDone?.(job);
      // Forget finished jobs after a while.
      setTimeout(() => {
        if (jobs.get(guildId) === job) jobs.delete(guildId);
      }, 10 * 60_000).unref?.();
    });
  return status(guildId);
}

async function run(guildId, spec, kind, job, save) {
  const rest = discord.rest;
  const role = await rest.post(Routes.guildRoles(guildId), {
    body: { name: spec.name, color: spec.color, permissions: "0", hoist: false, mentionable: false },
    reason: `Setting up the ${kind === "mute" ? "mute" : "shadowban"} role (dashboard)`,
  });
  job.roleId = role.id;

  // Every channel and category (threads follow their channel).
  const channels = (await rest.get(Routes.guildChannels(guildId)))
    .filter((c) => ![ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread].includes(c.type));
  job.total = channels.length;
  const queue = [...channels];
  const worker = async () => {
    for (let channel = queue.shift(); channel; channel = queue.shift()) {
      try {
        await rest.put(Routes.channelPermission(channel.id, role.id), {
          body: { type: 0, allow: "0", deny: spec.deny.toString() },
          reason: `Applying ${spec.name} role permissions`,
        });
      }
      catch {
        // Usually a channel Phoenix can't see or manage.
        job.failed++;
      }
      job.done++;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  // The role works now, so keep it even if the channel below can't be made.
  await save(spec.setting, role.id);
  discord.invalidateGuild(guildId);

  if (kind === "shadowban") {
    try {
      await makeShadowbanChannel(guildId, role, job);
    }
    catch (err) {
      job.error = `The role is ready, but Phoenix couldn't make the #shadowbanned channel (${err.rawError?.message ?? err.message}).`;
    }
  }
}

async function makeShadowbanChannel(guildId, role, job) {
  const rest = discord.rest;
  // The one channel shadowbanned members can still see.
  const everyone = guildId;
  const channel = await rest.post(Routes.guildChannels(guildId), {
    body: {
      name: "shadowbanned",
      type: ChannelType.GuildText,
      permission_overwrites: [
        { id: everyone, type: 0, deny: P.ViewChannel.toString(), allow: "0" },
        {
          id: role.id,
          type: 0,
          allow: (P.ViewChannel | P.SendMessages | P.ReadMessageHistory).toString(),
          deny: (P.AddReactions | P.AttachFiles | P.EmbedLinks | P.CreatePublicThreads | P.CreatePrivateThreads | P.CreateInstantInvite).toString(),
        },
      ],
    },
    reason: "Creating the shadowbanned channel",
  });
  job.channelId = channel.id;
  const message = await rest.post(Routes.channelMessages(channel.id), {
    body: {
      embeds: [{
        title: "⚠️ You've been shadowbanned!",
        description: "While you're shadowbanned, every other channel is hidden and this is the only one you can see.",
        color: Colors.Orange,
      }],
    },
  }).catch(() => null);
  const pin = Routes.channelMessagesPin ?? Routes.channelPin;
  if (message) await rest.put(pin(channel.id, message.id)).catch(() => undefined);
  discord.invalidateGuild(guildId);
}

module.exports = { start, status, KINDS };
