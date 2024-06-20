const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } = require("discord.js")

/**
 * Send a warning prompt in the server. If the user accepts, returns true, otherwise false.
 * @param {Message} message The message the warning is replying to.
 * @param {String} reason The text to display as the warning description.
 */
async function warnMessage(message, reason) {
    const embed = new EmbedBuilder()
    .setTitle(`Confirm your action`)
    .setDescription(reason)
    .setColor(Colors.Orange);

    const actionRow = new ActionRowBuilder()
    .addComponents(new ButtonBuilder()
    .setLabel(`Confirm`)
    .setCustomId(`ConfirmButton`)
    .setEmoji(`✅`)
    .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
    .setLabel(`Cancel`)
    .setCustomId(`CancelButton`)
    .setEmoji(`❌`)
    .setStyle(ButtonStyle.Danger)
    )

    const msg = await message.reply({embeds: [embed], components: [actionRow]}).catch(() => undefined);
    // Deny the request if the message failed to send.
    if (!msg) return false;

    const filter = (interaction) => (interaction.customId === 'ConfirmButton' || interaction.customId === 'CancelButton')  && interaction.user.id === message.author.id;
    const response = await msg.awaitMessageComponent({ filter, time: 15_000 })
    .then(function (interaction) {
        if (interaction.customId === `ConfirmButton`) {
            interaction.deferUpdate();
            setTimeout(function () {msg.delete()}, 500);
            return true;
        }
        if (interaction.customId === `CancelButton`) {
            interaction.deferUpdate();
            const tembed = new EmbedBuilder()
            .setTitle(`Confirm your action`)
            .setDescription(reason)
            .setFooter({text: `Declined.`})
            .setColor(Colors.Orange);

            const tactionRow = new ActionRowBuilder()
            .addComponents(new ButtonBuilder()
            .setLabel(`Confirm`)
            .setCustomId(`ConfirmButton`)
            .setEmoji(`✅`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
            new ButtonBuilder()
            .setLabel(`Cancel`)
            .setCustomId(`CancelButton`)
            .setEmoji(`❌`)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true));
            msg.edit({embeds: [tembed], components: [tactionRow]});
            return false;
        }
    })
    .catch(function () {
        const tembed = new EmbedBuilder()
        .setTitle(`Confirm your action`)
        .setDescription(reason)
        .setFooter({text: `Timed out.`})
        .setColor(Colors.Orange);

        const tactionRow = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
        .setLabel(`Confirm`)
        .setCustomId(`ConfirmButton`)
        .setEmoji(`✅`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
        new ButtonBuilder()
        .setLabel(`Cancel`)
        .setCustomId(`CancelButton`)
        .setEmoji(`❌`)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true));
        msg.edit({embeds: [tembed], components: [tactionRow]});
        return false;
    });
    if (response) return true;
    else return false;
}

module.exports = {
    warnMessage
}