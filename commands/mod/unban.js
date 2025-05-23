const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "unban",
      aliases: [`ub`],
      description: "Unbans a member.",
      detailedDescription: {
        usage: "unban <member> [reason] ",
        examples: ["unban sylveondev You're cool now"],
        args: [
          "member : The member to moderate",
          "reason : The reason for the action",
        ],
      },
      cooldownDelay: 1_800_000,
      cooldownLimit: 20,
      suggestedUserPermissions: [PermissionFlagsBits.BanMembers],
      requiredClientPermissions: [PermissionFlagsBits.BanMembers],
      preconditions: ["module"]
    });
  }

  async chatInputRun(interaction) {
    await interaction.deferReply();
    const member = await interaction.options.getUser("user");
    const reason = await interaction.options.getString("reason") || "No reason specified";

    if (interaction.user == member) {
      return interaction.followUp(`${this.container.emojis.error} You can't use this on yourself.`);
    }

    let caseid = 0;
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    caseid = db.infractions.length + 1;
    const thecase = {
      id: caseid,
      punishment: "Unban",
      member: member.id,
      moderator: interaction.member.id,
      reason: (reason ? reason : `No reason specified`),
      expiretime: 0,
      expired: false,
      hidden: false,
      modlogID: null,
      creationDate: Math.floor(Math.round(Date.now() / 1000))
    };

    const unban = await interaction.guild.bans.remove(member.id, `(Unban by ${interaction.user.tag}) ${reason}`).catch((e) => {
      return { id: "error", msg: e.message };
    });
    if (unban.id == `error`) {
      switch (unban.msg.toLowerCase()) {
        case "unknown ban": {
          await interaction.followUp(`${this.container.emojis.error} That user isn't banned.`);
          return;
        }
        default: {
          await interaction.followUp(`${this.container.emojis.error} ${unban.msg}`);
          return;
        }
      }
    }

    if (db.logging.infractions) {
      const channel = await interaction.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
          .setDescription(
            `**Offender:** ${member}\n**Moderator:** ${interaction.user}\n**Reason:** ${thecase.reason}`,
          )
          .setColor(Colors.Orange)
          .setFooter({ text: `ID ${member.id}` })
          .setTimestamp(new Date());

        const msg = await channel
          .send({
            // content: '',
            embeds: [embed],
          })
          .catch((err) => {
            console.error(`[error] Error on sending to channel`, err);
            return undefined;
          });
        if (msg) thecase.modlogID = msg.id;
      }
    }

    db.infractions.push(thecase);

    await db.save();
    interaction.followUp(
      `${this.container.emojis.success} Unbanned **${member.tag}**.`,
    );
  }
  
  async messageRun(message, args) {
    const member = await args.pick("user");
    const reason = await args.rest("string").catch(() => `No reason specified`);

    if (message.author == member) {
      return message.reply(`${this.container.emojis.error} You can't use this on yourself.`);
    }

    let caseid = 0;
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    caseid = db.infractions.length + 1;
    const thecase = {
      id: caseid,
      punishment: "Unban",
      member: member.id,
      moderator: message.member.id,
      reason: (reason ? reason : `No reason specified`),
      expiretime: 0,
      expired: false,
      hidden: false,
      modlogID: null,
      creationDate: Math.floor(Math.round(Date.now() / 1000))
    };

    const unban = await message.guild.bans.remove(member.id, `(Unban by ${message.author.tag}) ${reason}`).catch((e) => {
      return { id: "error", msg: e.message };
    });
    if (unban.id == `error`) {
      switch (unban.msg.toLowerCase()) {
        case "unknown ban": {
          await message.reply(`${this.container.emojis.error} That user isn't banned.`);
          return;
        }
        default: {
          await message.reply(`${this.container.emojis.error} ${unban.msg}`);
          return;
        }
      }
    }

    const timer = (await this.container.tasks.list({types: ["delayed", "waiting", "prioritized"]})).find(t => t.data.guildid == message.guild.id && t.data.memberid == member.id);
    if (timer) timer.remove();

    if (db.logging.infractions) {
      const channel = await message.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
          .setDescription(
            `**Offender:** ${member}\n**Moderator:** ${message.author}\n**Reason:** ${thecase.reason}`,
          )
          .setColor(Colors.Orange)
          .setFooter({ text: `ID ${member.id}` })
          .setTimestamp(new Date());

        const msg = await channel
          .send({
            // content: '',
            embeds: [embed],
          })
          .catch((err) => {
            console.error(`[error] Error on sending to channel`, err);
            return undefined;
          });
        if (msg) thecase.modlogID = msg.id;
      }
    }

    db.infractions.push(thecase);

    await db.save();
    message.reply(
      `${this.container.emojis.success} Unbanned **${member.tag}**.`,
    );
  }
}
module.exports = {
  PingCommand,
};
