// Reminders (/remind). Each one is a document plus a delayed BullMQ job; the job can
// run on any cluster, since sending goes through Discord's API either way.
const { container } = require("@sapphire/framework");
const { Routes } = require("discord.js");
const Reminder = require("./models/Reminder");

const MIN_DELAY = 60_000;
const MAX_DELAY = 365 * 86_400_000;
const MAX_PER_USER = 25;

const jobIdFor = (id) => `reminder-${id}`;

function schedule(reminder) {
  const delay = Math.max(0, new Date(reminder.dueAt).getTime() - Date.now());
  return container.tasks.create(
    { name: "reminder", payload: { id: String(reminder._id) } },
    { delay, customJobOptions: { jobId: jobIdFor(reminder._id), removeOnComplete: true, removeOnFail: true } },
  );
}

/** Creates a reminder. Throws a user-facing Error when it isn't allowed. */
async function createReminder({ userId, guildId, channelId, text, delay, dm }) {
  if (delay < MIN_DELAY) throw new Error("Reminders have to be at least a minute away.");
  if (delay > MAX_DELAY) throw new Error("Reminders can be at most a year away.");
  const active = await Reminder.countDocuments({ userId });
  if (active >= MAX_PER_USER) throw new Error(`You can have ${MAX_PER_USER} reminders at once. Cancel one with /remind cancel first.`);
  const reminder = await Reminder.create({ userId, guildId, channelId, text, dm: Boolean(dm), dueAt: new Date(Date.now() + delay) });
  try {
    await schedule(reminder);
  }
  catch (err) {
    console.error("[reminders] Couldn't schedule a reminder", err?.message ?? err);
    await Reminder.deleteOne({ _id: reminder._id }).catch(() => undefined);
    throw new Error("Couldn't set that reminder right now. Try again in a minute.");
  }
  return reminder;
}

async function cancelReminder(userId, idOrSuffix) {
  const mine = await Reminder.find({ userId }).sort({ dueAt: 1 }).lean();
  const query = String(idOrSuffix ?? "").trim().toLowerCase();
  const found = mine.find((r) => String(r._id) === query) ?? (query.length >= 4 ? mine.find((r) => String(r._id).endsWith(query)) : null);
  if (!found) return null;
  await Reminder.deleteOne({ _id: found._id });
  await container.tasks?.delete(jobIdFor(found._id)).catch(() => undefined);
  return found;
}

function listReminders(userId) {
  return Reminder.find({ userId }).sort({ dueAt: 1 }).lean();
}

/** The short id people type to cancel a reminder. */
const shortId = (id) => String(id).slice(-6);

function reminderText(reminder) {
  const created = Math.floor(new Date(reminder.createdAt).getTime() / 1000);
  return `⏰ <@${reminder.userId}>, you asked me to remind you <t:${created}:R>:\n>>> ${reminder.text}`.slice(0, 2000);
}

/**
 * Delivers a reminder: as a reply in the channel it was set in, or in DMs if asked
 * (or if Phoenix can't post in that channel, like in a server it isn't in).
 */
async function deliver(reminder) {
  // Claim it first, so a reminder is never sent twice (say, by the job and the
  // startup check at the same moment).
  const claimed = await Reminder.findOneAndDelete({ _id: reminder._id }).lean();
  if (!claimed) return false;
  reminder = claimed;
  const client = container.client;
  const content = reminderText(reminder);
  let delivered = false;
  let failure = null;

  if (!reminder.dm && reminder.channelId) {
    // Straight through the API: the job may run on a cluster that doesn't have this
    // server cached, which a channel fetch would treat as unknown.
    delivered = await client.rest
      .post(Routes.channelMessages(reminder.channelId), {
        body: {
          content,
          allowed_mentions: { users: [reminder.userId], replied_user: false },
          message_reference: reminder.replyTo ? { message_id: reminder.replyTo, fail_if_not_exists: false } : undefined,
        },
      })
      .then(() => true, (err) => {
        failure = err;
        return false;
      });
  }
  if (!delivered) {
    const user = await client.users.fetch(reminder.userId).catch(() => null);
    const note = !reminder.dm && reminder.channelId ? "\n-# I couldn't post in the channel you set this in, so it's here instead." : "";
    delivered = user
      ? await user.send({ content: `${content}${note}`.slice(0, 2000), allowedMentions: { users: [reminder.userId] } }).then(() => true, (err) => {
        failure = err;
        return false;
      })
      : false;
  }
  if (!delivered) {
    console.warn(`[reminders] Couldn't deliver reminder ${reminder._id} to ${reminder.userId} (channel and DMs both failed): ${failure?.message ?? "user not found"}`);
  }
  return delivered;
}

/**
 * On start: deliver reminders that came due while the bot was down, and make sure
 * every other reminder still has its job (in case Redis lost them).
 */
async function recoverReminders() {
  const pending = await Reminder.find({}).lean().catch(() => []);
  const now = Date.now();
  for (const reminder of pending) {
    if (new Date(reminder.dueAt).getTime() <= now) await deliver(reminder).catch(() => undefined);
    // Creating a job with an id that already exists does nothing, so this is safe.
    else await schedule(reminder).catch((err) => console.error("[reminders] Couldn't reschedule a reminder", err?.message ?? err));
  }
  if (pending.length) console.log(`[reminders] Checked ${pending.length} pending reminder(s) after starting.`);
}

module.exports = { MIN_DELAY, MAX_DELAY, MAX_PER_USER, createReminder, cancelReminder, listReminders, deliver, recoverReminders, shortId, reminderText };
