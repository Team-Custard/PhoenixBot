const {
  InteractionHandler,
  InteractionHandlerTypes,
} = require("@sapphire/framework");
const UserDB = require("../tools/UserDB");

class MenuHandler extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  parse(interaction) {
    if (
      interaction.customId == "userbotinfo" ||
      interaction.customId.startsWith("userbotephemeral")
    )
      return this.some();

    return this.none();
  }

  async run(interaction) {
    if (interaction.customId.startsWith("userbotephemeral")) {
      if (!interaction.customId.endsWith(interaction.user.id))
        return interaction.reply({
          content: `Sorry, you can't use that button on messages you don't invoke.`,
          ephemeral: true,
        });
      await interaction.deferReply({ ephemeral: true });
      const db = await UserDB.findById(interaction.user.id);
      if (!db)
        return interaction.followUp(
          `:x: You need to configure UserDB before you can do that.`,
        );
      db.ephemeral = db.ephemeral ? false : true;
      db.save()
        .then(() => {
          interaction.followUp(
            `:white_check_mark: ${db.ephemeral ? `Enabled ephemeral output.` : `Disabled ephemeral output.`}`,
          );
        })
        .catch((err) => {
          interaction.followUp(`:x: ${err}`);
        });
    }

    if (interaction.customId == "userbotinfo") {
      return interaction.reply({
        content:
          `### About Userapps\nUserapps are a new feature by Discord that allows you to use supported bots in direct messages and servers that have not have the bot. ` +
          `It can be used to run simple tasks through the bot like getting a timezone or translating a message.\n` +
          `Userapps are limited and cannot do most some things as server invited bots can however, full functionality is gained the bot would have to be invited.` +
          `To add a UserBot to your account, click \`add app\` button on the bot profile and click try it out. To remove the bot from your account, go to account settings, click authorized apps, and deauthorize the bot.` +
          `To learn more about Discord user bots, go to [Discord's support page](<https://support.discord.com/hc/en-us/articles/21334461140375-Using-Apps-on-Discord>).`,
        ephemeral: true,
      });
    }
  }
}

module.exports = {
  MenuHandler,
};
