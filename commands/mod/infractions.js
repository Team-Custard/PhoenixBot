const { PaginatedMessage } = require("@sapphire/discord.js-utilities");

const { Command, Args } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors, Message } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "infractions",
      aliases: [`inf`, `cases`, `warns`],
      description: "Displays a user's infractions.",
      detailedDescription: {
        usage: "infractions <user> [type]",
        examples: ["infractions sylveondev warn"],
        args: ["user : The member to search", "type: Only show a certain infraction type"],
        falgs: ["long: Shows the infractions in a single column for better viewing"]
      },
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ModerateMembers],
      preconditions: ["module"],
      flags: true,
      options: true
    });
  }


  async chatInputRun(interaction) {
    const user = interaction.options.getUser('user');
    const onlyType = interaction.options.getString('punishment');
    const long = interaction.options.getString('long');
    await interaction.deferReply();

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    let infractions = [];
    if (onlyType) infractions = db.infractions.filter((c) => (c.member == user.id && c.punishment.toLowerCase().startsWith(onlyType)));
    else infractions = db.infractions.filter((c) => c.member == user.id);
    if (infractions.length == 0) {
      return interaction.followUp(
        `${this.container.emojis.error} No infractions on **${user.tag}**. ${onlyType ? `They have never recieved an infraction for the type you're looking for.`: `They're squeaky clean.`}`,
      );
    }
    infractions = infractions.reverse();
    const paginated = new PaginatedMessage();
    const embedFields = [];
    infractions.forEach((inf, index) => {
      embedFields.push({name: `\` ${inf.id} \` **${inf.punishment}**`, value: `* **Created:** ${inf.creationDate ? `<t:${inf.creationDate}:R>` : `Unknown`}\n* **Moderator:** <@!${inf.moderator}>\n* **Reason:** ${inf.reason ? inf.reason : `No reason specified`}${inf.expiretime != 0 ? `\n* **Expires:** <t:${inf.expiretime}:R>`: ``}`, inline: (long ? false : true)})
    });

    // Create a new embed every nine infractions, and add it to a paginated message.
    for (let i = 0; i < infractions.length; i += 9) {
      console.log(i)
      await paginated.addPageBuilder(page => page
        .setEmbeds([new EmbedBuilder()
          .setAuthor({
            name: user.tag,
            iconURL: user.displayAvatarURL({ dynamic: true })
          })
          .setTitle(i == 0 ? (onlyType ? `${infractions.length} found infractions` : `${db.infractions.filter(i => (i.punishment == "Warn" && i.member == user.id)).length} active warnings - ${db.infractions.filter(i => i.member == user.id).length} total infractions`) : null)
          .addFields(embedFields.slice(i, i+9))
          .setColor(Colors.Orange)
          .setTimestamp(new Date())
        ])
      )
    }

    // Send the final message
    await paginated.run(interaction, interaction.user);
  }

  /**
   * 
   * @param {Message} message 
   * @param {Args} args 
   */
  async messageRun(message, args) {
    const user = await args.pick("user");
    const onlyType = await args.pick("string").catch(() => undefined);
    const long = args.getFlags('long', 'l');

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    let infractions = [];
    // If a specific infraction was specified, filter for that. Otherwise return all infractions.
    if (onlyType) infractions = db.infractions.filter((c) => (c.member == user.id && c.punishment.toLowerCase().startsWith(onlyType)));
    else infractions = db.infractions.filter((c) => c.member == user.id);
    
    // Nothing was found skill issue lmfao
    if (infractions.length == 0) {
      return message.reply(
        `${this.container.emojis.error} No infractions on **${user.tag}**. ${onlyType ? `They have never recieved an infraction for the type you're looking for.`: `They're squeaky clean.`}`,
      );
    }

    // Flips the infractions to have latest first, and define a paginated message.
    infractions = infractions.reverse();
    const paginated = new PaginatedMessage();

    // If this doesn't work I'm jumping off a bridge. LMFAO
    // Just like my depressing life, it's cached, so new infractions may not show up right away.

    // Make fields to be used in embeds.
    const embedFields = [];
    infractions.forEach((inf, index) => {
      embedFields.push({name: `\` ${inf.id} \` **${inf.punishment}**`, value: `* **Created:** ${inf.creationDate ? `<t:${inf.creationDate}:R>` : `Unknown`}\n* **Moderator:** <@!${inf.moderator}>\n* **Reason:** ${inf.reason ? inf.reason : `No reason specified`}${inf.expiretime != 0 ? `\n* **Expires:** <t:${inf.expiretime}:R>`: ``}`, inline: (long ? false : true)})
    });

    // Create a new embed every nine infractions, and add it to a paginated message.
    for (let i = 0; i < infractions.length; i += 9) {
      console.log(i)
      await paginated.addPageBuilder(page => page
        .setEmbeds([new EmbedBuilder()
          .setAuthor({
            name: user.tag,
            iconURL: user.displayAvatarURL({ dynamic: true })
          })
          .setTitle(i == 0 ? (onlyType ? `${infractions.length} found infractions` : `${db.infractions.filter(i => (i.punishment == "Warn" && i.member == user.id)).length} active warnings - ${db.infractions.filter(i => i.member == user.id).length} total infractions`) : null)
          .addFields(embedFields.slice(i, i+9))
          .setColor(Colors.Orange)
          .setTimestamp(new Date())
        ])
      )
    }

    // Send the final message
    await paginated.run(message, message.author);
    
    //Below here is the old infraction code. Very shitty, wouldn't recommend using.
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
