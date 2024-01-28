const { MessagePrompterMessageStrategy, MessagePrompterBaseStrategy } = require('@sapphire/discord.js-utilities');
const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const { EmbedBuilder, Colors, MessageCollector } = require('discord.js');
const database = require('../Tools/SettingsSchema');

const currentlyVerifying = [];

// The code to generate a verification method. Code taken from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}


class ParseExampleInteractionHandler extends InteractionHandler {
  constructor(ctx) {
    super(ctx, { interactionHandlerType: InteractionHandlerTypes.Button });
  }

  // We'll look a little later in this guide on how to type this method, but for now, we'll type it as any.
  async run(interaction) {
    // The `awesomenessLevel` variable has what we returned in the `parse` method's
    // `this.some`! In this example, we just show it to the user
    if (currentlyVerifying.indexOf(interaction.member.id) != -1) return interaction.reply({ content: `You're already in the process of being verified. Check your dms.`, ephemeral: true });

    const serverdb = await database.findById(interaction.guild.id).exec();

    if (serverdb.verification.channel == "" || serverdb.verification.channel == undefined) return interaction.reply({ content: `Verification is currently disabled.`, ephemeral: true });
    if (interaction.member.roles.cache.has(serverdb.verification.role)) return interaction.reply({ content: `You're already verified.`, ephemeral: true });
    await interaction.reply({ content: `Verification prompt started. Check your dms.`, ephemeral: true });

    const code = await makeid(10);
    const embed = new EmbedBuilder()
    .setAuthor({ iconURL: interaction.guild.iconURL(), name: `Verification` })
    .setDescription(`To verify in **${interaction.guild.name}**, enter the following code below.\n\`\`\`${code}\`\`\``)
    .setFooter({ text: `You have 15 seconds to respond.` })
    .setColor(Colors.Orange);

    await interaction.member.send({ embeds: [embed] })
    .then(async (prompt) => {
        currentlyVerifying.push(interaction.member.id);
        const filter = m => m.author.id = interaction.member.id;
        const messages = await interaction.member.dmChannel.awaitMessages({ filter, max: 1, maxProcessed: 1, time: 15_000, errors: ['time'] }).catch((e) => {
            console.error(e);
            return undefined;
        });
        if (messages == undefined) {
            const errorembed = new EmbedBuilder()
            .setAuthor({ iconURL: interaction.guild.iconURL(), name: `Verification` })
            .setDescription(`The timer has expired. Try again.`)
            .setFooter({ text: `Prompt expired.` })
            .setColor(Colors.Red);
            currentlyVerifying.splice(currentlyVerifying.indexOf(interaction.member.id, 1));
            return prompt.edit({ embeds: [errorembed] });
        }
        const msg = messages.first();
        if (msg.content != code) {
            const errorembed = new EmbedBuilder()
            .setAuthor({ iconURL: interaction.guild.iconURL(), name: `Verification` })
            .setDescription(`You entered the incorrect code. Try again.`)
            .setFooter({ text: `Prompt expired.` })
            .setColor(Colors.Red);
            currentlyVerifying.splice(currentlyVerifying.indexOf(interaction.member.id, 1));
            return prompt.edit({ embeds: [errorembed] });
        }
        const role = await interaction.guild.roles.fetch(serverdb.verification.role);
        interaction.member.roles.add(role, `(${this.container.client.user.tag}) Verification succeeded.`)
        .then(() => {
          const errorembed = new EmbedBuilder()
          .setAuthor({ iconURL: interaction.guild.iconURL(), name: `Verification` })
          .setDescription(`Verification successful. Welcome to ${interaction.guild.name}.`)
          .setFooter({ text: `Prompt succeeded.` })
          .setColor(Colors.Green);
          currentlyVerifying.splice(currentlyVerifying.indexOf(interaction.member.id, 1));
          return prompt.edit({ embeds: [errorembed] });
        })
        .catch((err)=> {
            const errorembed = new EmbedBuilder()
            .setAuthor({ iconURL: interaction.guild.iconURL(), name: `Verification` })
            .setDescription(`There was an error while giving you the verified role.\n\`\`\`${err}\`\`\`\nBring this issue to the server admin attention.`)
            .setFooter({ text: `Prompt expired.` })
            .setColor(Colors.Red);
            currentlyVerifying.splice(currentlyVerifying.indexOf(interaction.member.id, 1));
            return prompt.edit({ embeds: [errorembed] });
        });
        
    }).catch((e) => console.log(e.message));
  }

  parse(interaction) {
    // If the custom id does not start with `is-user-awesome`, we do not want this
    // handler to run.
    if (!interaction.customId == 'verifyButton') return this.none();

    return this.some();
  }
}

module.exports = {
  ParseExampleInteractionHandler
};