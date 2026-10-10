const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const UserDB = require("../../tools/UserDB");

class PronounsCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "pronouns",
      aliases: ["pronoun"],
      description: "Displays a user's pronouns (from UserDB).",
      examples: ["pronouns @sylveondev"],
      args: [{ name: "user", type: "user", description: "Whose pronouns to show (defaults to you)" }],
      slash: { group: "userdb" },
      guildOnly: false,
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"],
    });
  }

  async run(ctx, { user }) {
    user = user ?? ctx.user;
    const prefs = await UserDB.findById(user.id).lean().cacheQuery();
    if (!prefs?.pronouns) return ctx.error(`${emoji("error")} **${user.username}** does not have pronouns set through UserDB.`);
    return ctx.reply({ content: `**${user.username}**'s pronouns are **${prefs.pronouns}**.`, allowedMentions: { parse: [] } });
  }
}

module.exports = { PronounsCommand };
