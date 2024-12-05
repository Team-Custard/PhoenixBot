const { PaginatedMessage } = require("@sapphire/discord.js-utilities");

const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "infractions",
      aliases: [`inf`, `cases`],
      description: "Displays a user's infractions.",
      detailedDescription: {
        usage: "infractions <user>",
        examples: ["infractions sylveondev"],
        args: ["user : The member to search"],
      },
      cooldownDelay: 3_000,
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    const user = await args.pick("user");

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    let infractions = db.infractions.filter((c) => c.member == user.id);

    if (infractions.length == 0) {
      return message.reply(
        `${this.container.emojis.error} No infractions on **${user.tag}**. They're squeaky clean.`,
      );
    }

    infractions = infractions.reverse();

    const paginated = new PaginatedMessage();

    // If this doesn't work I'm jumping off a bridge.
    // It's cached btw, so new infractions may not show up right away.
    for (let i = 0; i < infractions.length; i += 5) {
      console.log(i)
      await paginated.addPageBuilder(page => page
        .setEmbeds([new EmbedBuilder()
          .setAuthor({
            name: user.tag,
            iconURL: user.displayAvatarURL({ dynamic: true })
          })
          .setDescription(`${infractions.slice(i, i+5).map(inf => `\` ${inf.id} \` **${inf.punishment} by ${inf.hidden ? "hidden moderator" : `<@!${inf.moderator}>`}**\n* **Created:** ${inf.creationDate ? `<t:${inf.creationDate}>` : `Unknown`}\n* **Reason:** ${inf.reason}${inf.expiretime != 0 ? `\n* **Expires:** <t:${inf.expiretime}:R>` : ``}`).join(`\n`)}`)
          .setColor(Colors.Orange)
          .setTimestamp(new Date())
        ])
      )
    }

    await paginated.run(message, message.author);
    
    /* const list = infractions.map(
      (m, i) =>
        `${i + 1}: ${m.punishment} | ${m.id} | ${m.hidden ? `Hidden` : this.container.client.users.cache.get(m.moderator) ? this.container.client.users.cache.get(m.moderator).tag : m.moderator} | ${m.reason} | ${m.expiretime == 0 ? `Permanent` : m.expiretime} | ${m.expired ? `Expired` : `Active`}`,
    );

    message.reply(`\`\`\`${list.join("\n")}\`\`\``); */
  }
}
module.exports = {
  PingCommand,
};
