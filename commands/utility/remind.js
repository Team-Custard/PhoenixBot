const { ApplicationIntegrationType, InteractionContextType } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const reminders = require("../../tools/reminders");

const EVERYWHERE = {
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
};

class RemindCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "remind",
      aliases: ["remindme", "reminder", "reminders"],
      description: "Reminds you about something later, in this chat or in your DMs.",
      examples: ["remind 30m Take the pizza out", "remind 2d Renew the domain --dm", "remind list", "remind cancel 3f9a2c"],
      subcommands: [
        {
          name: "set",
          description: "Sets a reminder",
          default: true,
          run: "set",
          args: [
            { name: "time", type: "duration", required: true, description: "When to remind you, like 10m, 2h or 3d" },
            { name: "reminder", type: "string", required: true, rest: true, maxLength: 1000, description: "What to remind you about" },
            { name: "dm", type: "boolean", aliases: ["d"], description: "Send it to your DMs instead of this chat" },
          ],
        },
        { name: "list", description: "Shows your reminders", run: "list" },
        {
          name: "cancel",
          description: "Cancels a reminder",
          run: "cancel",
          args: [{ name: "id", type: "string", required: true, autocomplete: true, maxLength: 24, description: "The reminder to cancel (from /remind list)" }],
        },
      ],
      guildOnly: false,
      slash: { contexts: EVERYWHERE.contexts, integrationTypes: EVERYWHERE.integrationTypes },
      cooldownDelay: 3_000,
    });
  }

  async set(ctx, { time, reminder, dm }) {
    // As a user app in a group DM or a server without Phoenix, it can't post in the chat later.
    const interaction = ctx.interaction;
    const cantPostHere = Boolean(interaction) && (interaction.context === InteractionContextType.PrivateChannel || (interaction.guildId && !interaction.guild));
    const toDm = Boolean(dm) || cantPostHere;
    let created;
    try {
      created = await reminders.createReminder({
        userId: ctx.user.id,
        guildId: ctx.guild?.id ?? null,
        channelId: ctx.channel?.id ?? ctx.interaction?.channelId ?? null,
        text: reminder,
        delay: time,
        dm: toDm,
      });
    }
    catch (err) {
      return ctx.error(`${emoji("error")} ${err.message}`);
    }
    const due = Math.floor(created.dueAt.getTime() / 1000);
    const sent = await ctx.reply({
      content: `${emoji("success")} I'll remind you <t:${due}:R> (<t:${due}:f>)${toDm ? " in your DMs" : ""}.${cantPostHere && !dm ? " I can't post in this chat, so it'll be a DM." : ""}\n-# Cancel it with \`/remind cancel ${reminders.shortId(created._id)}\`.`,
      allowedMentions: { parse: [] },
    });
    // Reply to this message when the time comes (prefix commands reply to the command).
    const replyTo = ctx.isSlash ? sent?.id : ctx.message?.id;
    if (replyTo) await require("../../tools/models/Reminder").updateOne({ _id: created._id }, { $set: { replyTo } }).catch(() => undefined);
    return sent;
  }

  async list(ctx) {
    const mine = await reminders.listReminders(ctx.user.id);
    if (!mine.length) return ctx.reply({ content: `${emoji("info")} You don't have any reminders. Set one with \`/remind set\`.`, ephemeral: true });
    const lines = mine.map((r) => {
      const due = Math.floor(new Date(r.dueAt).getTime() / 1000);
      const text = r.text.length > 80 ? `${r.text.slice(0, 79)}…` : r.text;
      return `\`${reminders.shortId(r._id)}\` <t:${due}:R>${r.dm ? " (DM)" : ""}: ${text}`;
    });
    return ctx.reply({ content: `**Your reminders** (${mine.length} of ${reminders.MAX_PER_USER})\n${lines.join("\n")}`.slice(0, 2000), ephemeral: true, allowedMentions: { parse: [] } });
  }

  async cancel(ctx, { id }) {
    const removed = await reminders.cancelReminder(ctx.user.id, id);
    if (!removed) return ctx.error(`${emoji("error")} You don't have a reminder with that id. See \`/remind list\`.`);
    return ctx.reply({ content: `${emoji("success")} Cancelled your reminder: ${removed.text.slice(0, 200)}`, ephemeral: true, allowedMentions: { parse: [] } });
  }
}

module.exports = { RemindCommand };
