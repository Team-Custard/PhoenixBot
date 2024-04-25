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
      if (!interaction.customId == 'userdbModal') return this.none();

      return this.some();
    }

    async run(interaction) {
        await interaction.deferReply({ ephemeral: false });

        let usersettings = await UserDB.findById(interaction.member.id, UserDB.upsert).cacheQuery();
        if (!usersettings) usersettings = new UserDB({ _id: interaction.member.id });

        const tzText = await interaction.fields.getTextInputValue('timezoneField');
        const pronounText = await interaction.fields.getTextInputValue('pronounField');
        const descText = await interaction.fields.getTextInputValue('descriptionField');
        const ytText = await interaction.fields.getTextInputValue('youtubeField');
        const twtText = await interaction.fields.getTextInputValue('twitterField');

        if (tzText) {
            if (!require('../tools/timezones.json').includes(tzText)) return interaction.followUp(`:x: timezone: Incorrect timezone specified. Make sure you enter your timezone in the tz format (<https://en.wikipedia.org/wiki/List_of_tz_database_time_zones>)`);

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