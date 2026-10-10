const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const UserDB = require("../../tools/UserDB");

class AfkCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "afk",
      aliases: ["setafk"],
      description: "Sets your AFK status. It clears the next time you send a message.",
      examples: ["afk Eating dinner"],
      args: [{ name: "reason", type: "string", rest: true, maxLength: 200, default: "AFK", description: "Why you're away" }],
      slash: { group: "userdb" },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"],
    });
  }

  async run(ctx, { reason }) {
    const prefs = (await UserDB.findById(ctx.user.id)) ?? new UserDB({ _id: ctx.user.id });
    if (prefs.afk?.since) {
      return ctx.reply(`${emoji("warning")} You already have an AFK status set. It clears the next time you send a message.`);
    }
    prefs.afk = { since: String(Math.floor(Date.now() / 1000)), status: reason };
    await prefs.save();
    return ctx.reply({
      content: `${emoji("success")} Successfully set your afk to \`${reason}\`. \n-# To remove your afk status, simply send a message in a server with Phoenix in it.`,
      allowedMentions: { parse: [] },
    });
  }
}

module.exports = { AfkCommand };
