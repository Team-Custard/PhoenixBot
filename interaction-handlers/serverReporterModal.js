const {
    InteractionHandler,
    InteractionHandlerTypes,
  } = require("@sapphire/framework");
  const userSettings = require("../tools/UserDB");
  
  class MenuHandler extends InteractionHandler {
    constructor(ctx, options) {
      super(ctx, {
        ...options,
        interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
      });
    }
  
    parse(interaction) {
      if (!interaction.customId.startsWith("reportModal")) return this.none();
  
      return this.some();
    }
  
    async run(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const serverid = interaction.customId.slice().trim().split("-")[1];
  
      const reasonText = await interaction.fields.getTextInputValue("reportField");
      if (reasonText) {
        const db = await userSettings.findById(
          interaction.user.id,
          userSettings.upsert,
        ).cacheQuery();
  
        if (db.blacklist.reportBlacklist) {
          return interaction.followUp(
            `${this.container.emojis.error} You have been blacklisted from making reports. This could be due to a number of reasons like submitting troll reports, or spamming reports.\n-# To appeal this decision, join https://discord.gg/PnUYnBbxER`,
          );
        }

        if (db.reportedServers.find(r => r.id == serverId)) {
          return interaction.followUp(
            `${this.container.emojis.error} You have already reported this server. Please allow us time to review this server.`,
          );
        }
        const role = await interaction.guild.roles
          .fetch(db.verification.role)
          .catch(() => undefined);
        if (!role) {
          return interaction.followUp(
            `${this.container.emojis.error} I couldn't find the verified role anymore as the role appears to have been deleted. You need to use the verification setup command again. Please bring this to your server's admin's attention.`,
          );
        }
        interaction.member.roles
          .add(role, `Verification`)
          .then(async () => {
            return interaction.followUp(
              db.verification.verifiedText
                ? `${this.container.emojis.success} ${await require("../tools/textParser").parse(db.verification.verifiedText, interaction.member)}`
                : `${this.container.emojis.success} You have been verified. Enjoy this server,`,
            );
          })
          .catch((err) => {
            console.error(err);
            return interaction.followUp(
              `${this.container.emojis.error} I couldn't give you the verified role, most likely I don't have permission to hand out roles or the role is above my topmost role. Please bring this to your server's admin's attention.`,
            );
          });
      } else {
        interaction.followUp(`${this.container.emojis.error} Invalid code specified.`);
      }
    }
  }
  
  module.exports = {
    MenuHandler,
  };
  