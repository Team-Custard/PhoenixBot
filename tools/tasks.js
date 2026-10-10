const { container } = require("@sapphire/framework");

// Scheduled tasks (temp bans, autokicks) get predictable job ids so they can be
// cancelled directly, instead of listing every pending job in Redis and searching
// through them (which used to happen on every member role change).
// BullMQ doesn't allow ":" in custom job ids.
const jobId = (taskName, guildId, userId) => `${taskName}-${guildId}-${userId}`;

/**
 * Schedules a task for a member, replacing any pending one of the same kind.
 * @param {string} taskName e.g. "tempBan" or "autoKick"
 * @param {object} payload Must include guildid and memberid.
 * @param {number} delay Milliseconds from now.
 */
async function scheduleMemberTask(taskName, payload, delay) {
  const id = jobId(taskName, payload.guildid, payload.memberid);
  await container.tasks.delete(id).catch(() => undefined);
  return container.tasks
    .create(
      { name: taskName, payload },
      { delay, customJobOptions: { jobId: id, removeOnComplete: true, removeOnFail: true } },
    )
    .catch((err) => console.error(`[error] Failed to schedule ${taskName}`, err));
}

/**
 * Cancels a member's pending task.
 * @param {object} [options]
 * @param {boolean} [options.scanLegacy] Also search jobs created before job ids were
 *   predictable. Expensive on big queues, so only use it for rare commands.
 */
async function cancelMemberTask(taskName, guildId, userId, { scanLegacy = false } = {}) {
  const removed = await container.tasks.delete(jobId(taskName, guildId, userId)).catch(() => undefined);
  if (!scanLegacy) return removed;

  const jobs = await container.tasks.list({ types: ["delayed", "waiting", "prioritized"] }).catch(() => []);
  await Promise.all(
    jobs
      .filter((job) => job?.name === taskName && job.data?.guildid == guildId && job.data?.memberid == userId)
      .map((job) => job.remove().catch(() => undefined)),
  );
  return removed;
}

module.exports = { scheduleMemberTask, cancelMemberTask, jobId };
