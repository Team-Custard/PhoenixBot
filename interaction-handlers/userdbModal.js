const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const UserDB = require('../tools/UserDB');

class MenuHandler extends InteractionHandler {
    constructor(ctx, options) {
      super(ctx, {
        ...options,
        interactionHandlerType: InteractionHandlerTypes.ModalSubmit
      });
    }

    parse(interaction) {
      if (interaction.customId !== 'userdbModal') return this.none();

      return this.some();
    }

    async run(interaction) {
        await interaction.deferReply({ ephemeral: false });

        let usersettings = await UserDB.findById(interaction.member.id, UserDB.upsert).cacheQuery();
        if (!usersettings) usersettings = new UserDB({ _id: interaction.member.id });

        const tzText = await interaction.fields.getTextInputValue('timezoneField', false);
        const pronounText = await interaction.fields.getTextInputValue('pronounField', false);
        const descText = await interaction.fields.getTextInputValue('descriptionField', false);
        const ytText = await interaction.fields.getTextInputValue('youtubeField', false);
        const twtText = await interaction.fields.getTextInputValue('twitterField', false);

        if (tzText) {
            const moment = require('moment-timezone');
            const timezones = moment.tz.names();
            if (!timezones.includes(tzText)) return interaction.followUp(`:x: timezone: Incorrect timezone specified. If you'd like, you can have Phoenix automatically detect your timezone at https://phoenixbot.epicgamer.org/userdb/tzhelp`);
            if (tzText.length < 4) return interaction.followUp(`:x: timezone: Sorry, we only support tz format timezones. If you'd like, you can have Phoenix automatically detect your timezone at https://phoenixbot.epicgamer.org/userdb/tzhelp`);
            usersettings.timezone = tzText;
        }
        if (pronounText) {
            usersettings.pronouns = pronounText;
        }
        if (descText) {
            usersettings.description = descText;
        }
        if (ytText) {
            if (!twtText.startsWith('@')) return interaction.followUp(`:x: youtube: Your handle is incorrect.`);
            usersettings.socials.youtube = ytText;
        }
        if (twtText) {
            if (!twtText.startsWith('@')) return interaction.followUp(`:x: twitter: Your handle is incorrect.`);
            usersettings.socials.twitter = twtText;
        }

        usersettings.save()
        .then(() => {
            interaction.followUp({ content: `:white_check_mark: Successfully setup UserDB.`, ephemeral: false });
        }).catch((err) => {interaction.followUp(`:x: ${err}`);});
    }
}

module.exports = {
    MenuHandler
};