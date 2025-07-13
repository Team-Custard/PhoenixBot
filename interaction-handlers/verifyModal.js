const {
  InteractionHandler,
  InteractionHandlerTypes,
} = require("@sapphire/framework");
const ServerSettings = require("../tools/SettingsSchema");

class MenuHandler extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  parse(interaction) {
    if (!interaction.customId.startsWith("verifyModal")) return this.none();

    return this.some();
  }

  async run(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const code = interaction.customId.slice().trim().split("-")[1];

    const codeText = await interaction.fields.getTextInputValue("verifyField");
    if (codeText.toLowerCase() == code.toLowerCase()) {
      const db = await ServerSettings.findById(
        interaction.guild.id,
        ServerSettings.upsert,
      ).cacheQuery();

      if (!db.verification.role) {
        return interaction.followUp(
          `${this.container.emojis.error} Verification was not setup yet. Please bring this to your server's admin's attention.`,
        );
      }
      const role = await interaction.guild.roles
        .fetch(db.verification.role)
        .catch(() => undefined);
      if (!role) {
        interaction.followUp(
          `${this.container.emojis.error} I couldn't find the verified role anymore as the role appears to have been deleted. You need to use the verification setup command again. Please bring this to your server's admin's attention.`,
        );
        if (db.logging.verification) {
          const channel = await member.guild.channels
            .fetch(db.logging.verification)
            .catch(() => undefined);
          if (channel) {
            const webhook = await webhookFetch.find(channel);
    
            if (!webhook) {
              console.log("Welp didn't find a webhook, sry.");
              return;
            }
            const embed = new EmbedBuilder()
              .setAuthor({
                name: member.user.username,
                iconURL: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
              })
              .setDescription(
                `${member} was unable to verify due to a missing verified role.`,
              )
              .setColor(Colors.Orange)
              .setTimestamp(new Date());
    
            await webhook
              .send({
                // content: '',
                username: this.container.client.user.username,
                avatarURL: this.container.client.user.displayAvatarURL({
                  extension: "png",
                  size: 512,
                }),
                embeds: [embed],
              })
              .catch((err) =>
                console.error(`[error] Error on sending webhook`, err),
              );
          }
        }
        return
      }
      interaction.member.roles
        .add(role, `Verification`)
        .then(async () => {
        })
        .then(async () => {
          if (db.verification.unverifiedRole) interaction.member.roles.remove(db.verification.unverifiedRole, `Verification`).catch(() => undefined);
          if (db.logging.verification) {
            const channel = await member.guild.channels
              .fetch(db.logging.verification)
              .catch(() => undefined);
            if (channel) {
              const webhook = await webhookFetch.find(channel);
      
              if (!webhook) {
                console.log("Welp didn't find a webhook, sry.");
                return;
              }
              const embed = new EmbedBuilder()
                .setAuthor({
                  name: member.user.username,
                  iconURL: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
                })
                .setDescription(
                  `${member} passed verification.`,
                )
                .setColor(Colors.Orange)
                .setTimestamp(new Date());
      
              await webhook
                .send({
                  // content: '',
                  username: this.container.client.user.username,
                  avatarURL: this.container.client.user.displayAvatarURL({
                    extension: "png",
                    size: 512,
                  }),
                  embeds: [embed],
                })
                .catch((err) =>
                  console.error(`[error] Error on sending webhook`, err),
                );
            }
          }
          return interaction.followUp(
            db.verification.verifiedText
              ? `${this.container.emojis.success} ${await require("../tools/textParser").parse(db.verification.verifiedText, interaction.member)}`
              : `${this.container.emojis.success} You have been verified. Enjoy this server,`,
          );
        })
        .catch(async (err) => {
          console.error(err);
          if (db.logging.verification) {
            const channel = await member.guild.channels
              .fetch(db.logging.verification)
              .catch(() => undefined);
            if (channel) {
              const webhook = await webhookFetch.find(channel);
      
              if (!webhook) {
                console.log("Welp didn't find a webhook, sry.");
                return;
              }
              const embed = new EmbedBuilder()
                .setAuthor({
                  name: member.user.username,
                  iconURL: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
                })
                .setDescription(
                  `${member} was unable to verify due to an error giving the role.`,
                )
                .setColor(Colors.Orange)
                .setTimestamp(new Date());
      
              await webhook
                .send({
                  // content: '',
                  username: this.container.client.user.username,
                  avatarURL: this.container.client.user.displayAvatarURL({
                    extension: "png",
                    size: 512,
                  }),
                  embeds: [embed],
                })
                .catch((err) =>
                  console.error(`[error] Error on sending webhook`, err),
                );
            }
          }
          return interaction.followUp(
            `${this.container.emojis.error} I couldn't give you the verified role, most likely I don't have permission to hand out roles or the role is above my topmost role. Please bring this to your server's admin's attention.`,
          );
        });
    } else {
      if (db.logging.verification) {
        const channel = await member.guild.channels
          .fetch(db.logging.verification)
          .catch(() => undefined);
        if (channel) {
          const webhook = await webhookFetch.find(channel);
  
          if (!webhook) {
            console.log("Welp didn't find a webhook, sry.");
            return;
          }
          const embed = new EmbedBuilder()
            .setAuthor({
              name: member.user.username,
              iconURL: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
            })
            .setDescription(
              `${member} failed verification.`,
            )
            .setColor(Colors.Orange)
            .setTimestamp(new Date());
  
          await webhook
            .send({
              // content: '',
              username: this.container.client.user.username,
              avatarURL: this.container.client.user.displayAvatarURL({
                extension: "png",
                size: 512,
              }),
              embeds: [embed],
            })
            .catch((err) =>
              console.error(`[error] Error on sending webhook`, err),
            );
        }
      }
      interaction.followUp(`${this.container.emojis.error} Invalid code specified.`);
    }
  }
}

module.exports = {
  MenuHandler,
};
