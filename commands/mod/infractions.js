const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "infractions",
      aliases: [`infractions`],
      description: "Displays a user's infractions.",
      detailedDescription: {
        usage: "infractions <user>",
        examples: ["infractions sylveondev"],
        args: ["user : The member to search"],
      },
      cooldownDelay: 3_000,
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
    });
  }

  async messageRun(message, args) {
    const user = await args.pick("user");

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const infractions = db.infractions.filter((c) => c.member == user.id);

    if (infractions.length == 0) {
      return message.reply(
        `:x: No infractions on **${user.tag}**. They're squeaky clean.`,
      );
    }

    const list = infractions.map(
      (m, i) =>
        `${i + 1}: ${m.punishment} | ${m.id} | ${m.hidden ? `Hidden` : this.container.client.users.cache.get(m.moderator) ? this.container.client.users.cache.get(m.moderator).tag : m.moderator} | ${m.reason} | ${m.expiretime == 0 ? `Permanent` : m.expiretime} | ${m.expired ? `Expired` : `Active`}`,
    );

    message.reply(`\`\`\`${list.join("\n")}\`\`\``);
  }
}
module.exports = {
  PingCommand,
};
