const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, Colors } = require("discord.js");
const userSettings = require("../../tools/UserDB");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "blacklist",
      aliases: ["botban"],
      description:
        "Blacklists a user from using Phoenix. The user will be notified unless the silent flag is used.",
      detailedDescription: {
        usage: "blacklist <user> <reason>",
        examples: ["blacklist @sylveondev Scamming via welcome dms"],
        args: ["user: The user to blacklist"],
        flags: ["silent: Don't notify the user"]
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["botModCommand"],
      flags: true,
    });
  }

  async messageRun(message, args) {
    return message.reply(`Soon:tm:`);
    const user = await args.pick("user");
    const silent = args.getFlags('silent', 's');
    const reason = await args.rest("string");

    const db = await userSettings.findById(
        user.id,
        userSettings.upsert,
      ).cacheQuery();

    // db.blacklist.botBlacklist = true;
    // db.blacklist.blackReason = reason;

    // await db.save();
    await message.react(`<:phoenixShock:1251263476249399397>`);
    await user.send(`# __ Notice of suspension __\n${this.container.emojis.warning} Hello **${user.displayName}**. Phoenix is a community backed bot designed to help manage servers. We have a [terms of service](https://phoenix.sylveondev.xyz/terms) to help keep everyone safe and happy on Discord. Consequentially due to breaking our terms, we have blacklisted you from using the bot for the following reason:\n\`\`\`${reason}\`\`\`\nThis action was taken by bot admin: ${message.member}. This blacklist will not expire.\n### What's next\nYou have been permanently blacklisted from using our bot. You cannot invite it to any of your servers and you can no longer access the Phoenix dashboard. If you have a running Phoenix subscription, you can cancel it in the subscriptions tab of user settings.\n### Appeals\n If you believe this blacklist was not correct, you can attempt to appeal it by joining the [support server](https://discord.gg/PnUYnBbxER "Join our server here"). Thank you for your interst in Phoenix. Have a good day.`);
  }
}
module.exports = {
  PingCommand,
};
