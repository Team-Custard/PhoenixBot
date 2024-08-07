const {
  InteractionHandler,
  InteractionHandlerTypes,
} = require("@sapphire/framework");
const UserDB = require("../tools/UserDB");

class MenuHandler extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  parse(interaction) {
    if (interaction.customId !== "userdbModal") return this.none();

    return this.some();
  }

  async run(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let usersettings = await UserDB.findById(
      interaction.user.id,
      UserDB.upsert,
    ).cacheQuery();
    if (!usersettings) usersettings = new UserDB({ _id: interaction.user.id });

    const tzText = await interaction.fields.getTextInputValue(
      "timezoneField",
      false,
    );
    const pronounText = await interaction.fields.getTextInputValue(
      "pronounField",
      false,
    );
    const descText = await interaction.fields.getTextInputValue(
      "descriptionField",
      false,
    );
    const ytText = await interaction.fields.getTextInputValue(
      "youtubeField",
      false,
    );
    const twtText = await interaction.fields.getTextInputValue(
      "twitterField",
      false,
    );

    let finishMessage = "";
    if (tzText) {
      const moment = require("moment-timezone");
      const timezones = moment.tz.names();
      if (!timezones.includes(tzText)) {
        finishMessage += `${this.container.emojis.warning} timezone: Incorrect timezone specified. Not setting timezone. If you'd like, you can have Phoenix automatically detect your timezone at https://phoenix.sylveondev.xyz/userdb/tzhelp\n`;
      } else if (tzText.length < 4) {
        finishMessage += `${this.container.emojis.warning} timezone: Sorry, we only support tz format timezones. Not setting timezone. If you'd like, you can have Phoenix automatically detect your timezone at https://phoenix.sylveondev.xyz/userdb/tzhelp\n`;
      } else {
        usersettings.timezone = tzText;
      }
    }
    if (pronounText) {
      usersettings.pronouns = pronounText;
    }
    if (descText) {
      usersettings.description = descText;
    }
    if (ytText) {
      if (!twtText.startsWith("@")) {
        finishMessage += `${this.container.emojis.warning} youtube: Your handle is incorrect. Not setting social.\n`;
      } else {
        usersettings.socials.youtube = ytText;
      }
    }
    if (twtText) {
      if (!twtText.startsWith("@")) {
        finishMessage += `${this.container.emojis.warning} twitter: Your handle is incorrect. Not setting social.\n`;
      } else {
        usersettings.socials.twitter = twtText;
      }
    }

    finishMessage += `${this.container.emojis.success} Successfully setup UserDB.`;
    usersettings
      .save()
      .then(() => {
        interaction.followUp({ content: finishMessage, ephemeral: true });
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }
}

module.exports = {
  MenuHandler,
};
