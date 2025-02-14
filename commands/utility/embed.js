const { Command, Args } = require("@sapphire/framework");
const serverSettings = require("../../tools/SettingsSchema");
const UserDB = require("../../tools/UserDB");
const { PermissionFlagsBits, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, Message } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "embed",
      aliases: ["sendembed"],
      description: "Launches the interactive embed builder, which allows you to create embeds with the bot. Embeds can also be used as role menus.",
      //description: "Sends an embed. You can use [this site](https://embed.dan.onl/) to generate embed code. Prefix commands are not supported for embeds.",
      detailedDescription: {
        usage: "embed",
        examples: ["embed"],
        args: [],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("embed")
        .setDescription("Sends an embed")
        /*.addStringOption((option) =>
          option
            .setName("json")
            .setDescription("Embed json")
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send the message in")
            .setRequired(false),
        )*/
        .setDMPermission(false)
        .setDefaultMemberPermissions(32),
    );
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async runEmbedBuilder(interaction) {
    const actionRowA = new ActionRowBuilder()
    .addComponents([
      new ButtonBuilder()
      .setCustomId('EmbedAuthor')
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Author"),
      new ButtonBuilder()
      .setCustomId('EmbedTitle')
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Title"),
      new ButtonBuilder()
      .setCustomId('EmbedFooter')
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Footer"),
      new ButtonBuilder()
      .setCustomId('EmbedImages')
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Images"),
    ]);
    const actionRowB = new ActionRowBuilder()
    .addComponents([
      new ButtonBuilder()
      .setCustomId('EmbedDescription')
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Description"),
      new ButtonBuilder()
      .setCustomId('EmbedAddField')
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Add Field"),
      new ButtonBuilder()
      .setCustomId('EmbedEditField')
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Edit Field"),
      new ButtonBuilder()
      .setCustomId('EmbedRemoveField')
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Remove Field"),
    ]);
    const actionRowC = new ActionRowBuilder()
    .addComponents([
      new ButtonBuilder()
      .setCustomId('EmbedSave')
      .setStyle(ButtonStyle.Success)
      .setLabel("Save Embed"),
      new ButtonBuilder()
      .setCustomId('EmbedLoad')
      .setStyle(ButtonStyle.Danger)
      .setLabel("Load Embed"),
      new ButtonBuilder()
      .setCustomId('EmbedDelete')
      .setStyle(ButtonStyle.Danger)
      .setLabel("Delete Embed"),
      new ButtonBuilder()
      .setCustomId('EmbedList')
      .setStyle(ButtonStyle.Primary)
      .setLabel("List all Embeds"),
      new ButtonBuilder()
      .setCustomId('EmbedSend')
      .setStyle(ButtonStyle.Primary)
      .setLabel("Finish and Send"),
    ]);

    const embed = new EmbedBuilder()
    .setTitle("Sample Embed")
    .setThumbnail("https://cdn.discordapp.com/emojis/1251263469299302472.png?size=1024")
    .setDescription("Hi there, this is the embed builder. You can customize the embed using the buttons below, and send the embed in the current channel when you are finished. If you want to customize the embed later, you can save the embed below. The embed autosaves to your UserDB profile so if you accidentially dismiss the embed, you can load it up again by hitting load autosave.")
    .setColor(Colors.Orange);

    interaction.reply({ embeds: [embed], components: [actionRowA, actionRowB, actionRowC], ephemeral: true });
    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({filter: (i) => i.user.id == interaction.user.id, componentType: ComponentType.Button, time: 1_800_000});

    collector.on("collect", async (collected) => {
      if (collected.customId == "EmbedAuthor") {
        const modal = new ModalBuilder()
        .setCustomId("ModalEmbedAuthor")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalAuthorNameField")
            .setLabel("Author name")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setValue(embed.data.author?.name ?? "")
            .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalAuthorImageField")
            .setLabel("Author image")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setValue(embed.data.author?.icon_url ?? "")
            .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalAuthorUrlField")
            .setLabel("Author url link")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setValue(embed.data.author?.url ?? "")
            .setRequired(false)
          ),
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalEmbedAuthor" && i.user.id == interaction.user.id), time: 900_000 });
          embed.setAuthor({ name: modalResponse.fields.getTextInputValue("ModalAuthorNameField") || null, iconURL: modalResponse.fields.getTextInputValue("ModalAuthorImageField") || null, url: modalResponse.fields.getTextInputValue("ModalAuthorUrlField") || null })
          await modalResponse.deferUpdate();
          await interaction.editReply({ embeds: [embed], components: [actionRowA, actionRowB, actionRowC] });
        }
        catch (err) {
          console.error('Error executing author embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedTitle") {
        const modal = new ModalBuilder()
        .setCustomId("ModalEmbedTitle")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalTitleField")
            .setLabel("Title")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setValue(embed.data.title ?? "")
            .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalURLField")
            .setLabel("URL")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setValue(embed.data.url ?? "")
            .setRequired(false)
          ),
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalEmbedTitle" && i.user.id == interaction.user.id), time: 900_000 });
          embed.setTitle(modalResponse.fields.getTextInputValue("ModalTitleField") || null).setURL(modalResponse.fields.getTextInputValue("ModalURLField") || null)
          await modalResponse.deferUpdate();
          await interaction.editReply({ embeds: [embed], components: [actionRowA, actionRowB, actionRowC] });
        }
        catch (err) {
          console.error('Error executing title embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedFooter") {
        const modal = new ModalBuilder()
        .setCustomId("ModalEmbedFooter")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalFooterTextField")
            .setLabel("Footer text")
            .setMaxLength(2048)
            .setStyle(TextInputStyle.Short)
            .setValue(embed.data.footer?.text ?? "")
            .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalFooterImageField")
            .setLabel("Footer image")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setValue(embed.data.footer?.icon_url ?? "")
            .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalTimestampField")
            .setLabel("Timestamp")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setValue(embed.data.timestamp ?? "")
            .setRequired(false)
          ),
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalEmbedFooter" && i.user.id == interaction.user.id), time: 900_000 });
          embed.setFooter({ text: modalResponse.fields.getTextInputValue("ModalFooterTextField") || null, iconURL: modalResponse.fields.getTextInputValue("ModalFooterImageField") || null }).setTimestamp(modalResponse.fields.getTextInputValue("ModalTimestampField") ? new Date(modalResponse.fields.getTextInputValue("ModalTimestampField")) : null)
          await modalResponse.deferUpdate();
          await interaction.editReply({ embeds: [embed], components: [actionRowA, actionRowB, actionRowC] });
        }
        catch (err) {
          console.error('Error executing footer embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedImages") {
        const modal = new ModalBuilder()
        .setCustomId("ModalEmbedImage")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalThumbnailField")
            .setLabel("Thumbnail")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setValue(embed.data.thumbnail?.url ?? "")
            .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalImageField")
            .setLabel("Image")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setValue(embed.data.image?.url ?? "")
            .setRequired(false)
          ),
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalEmbedImage" && i.user.id == interaction.user.id), time: 900_000 });
          embed.setThumbnail(modalResponse.fields.getTextInputValue("ModalThumbnailField") || null).setImage(modalResponse.fields.getTextInputValue("ModalImageField") || null)
          await modalResponse.deferUpdate();
          await interaction.editReply({ embeds: [embed], components: [actionRowA, actionRowB, actionRowC] });
        }
        catch (err) {
          console.error('Error executing images embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedDescription") {
        const modal = new ModalBuilder()
        .setCustomId("ModalDescription")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalDescriptionField")
            .setLabel("Description")
            .setMaxLength(4000)
            .setStyle(TextInputStyle.Paragraph)
            .setValue(embed.data.description ?? "")
            .setRequired(false)
          ),
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalDescription" && i.user.id == interaction.user.id), time: 900_000 });
          embed.setDescription(modalResponse.fields.getTextInputValue("ModalDescriptionField") || null)
          await modalResponse.deferUpdate();
          await interaction.editReply({ embeds: [embed], components: [actionRowA, actionRowB, actionRowC] });
        }
        catch (err) {
          console.error('Error executing description embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedAddField") {
        if (embed.data.fields?.length == 12) return collected.reply({ ephemeral: true, content: `Too many fields! You can only have up to 12 fields.` })
        const modal = new ModalBuilder()
        .setCustomId("ModalAddField")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalFieldNameField")
            .setLabel("Field name")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalFieldValueField")
            .setLabel("Field value")
            .setMaxLength(1024)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalFieldInlineField")
            .setLabel("Inline (true/false)")
            .setMaxLength(5)
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
          ),
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalAddField" && i.user.id == interaction.user.id), time: 900_000 });
          embed.addFields([
            { name: modalResponse.fields.getTextInputValue("ModalFieldNameField"), value: modalResponse.fields.getTextInputValue("ModalFieldValueField"), inline: modalResponse.fields.getTextInputValue("ModalFieldInlineField") == "true" ? true : false }
          ])
          await modalResponse.deferUpdate();
          await interaction.editReply({ embeds: [embed], components: [actionRowA, actionRowB, actionRowC] });
        }
        catch (err) {
          console.error('Error executing add field embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedEditField") {
        const modal = new ModalBuilder()
        .setCustomId("ModalEditField")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalFieldIndexField")
            .setLabel("Field index (0-11)")
            .setMaxLength(2)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalFieldNameField")
            .setLabel("Field name")
            .setMaxLength(256)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalFieldValueField")
            .setLabel("Field value")
            .setMaxLength(1024)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalFieldInlineField")
            .setLabel("Inline (true/false)")
            .setMaxLength(5)
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
          ),
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalEditField" && i.user.id == interaction.user.id), time: 900_000 });
          if (!embed.data.fields.at(new Number(modalResponse.fields.getTextInputValue("ModalFieldIndexField")))) return interaction.reply('Invalid field value');
          embed.data.fields.at(new Number(modalResponse.fields.getTextInputValue("ModalFieldIndexField")))
          .name = modalResponse.fields.getTextInputValue("ModalFieldNameField");
          embed.data.fields.at(new Number(modalResponse.fields.getTextInputValue("ModalFieldIndexField")))
          .value = modalResponse.fields.getTextInputValue("ModalFieldValueField")
          embed.data.fields.at(new Number(modalResponse.fields.getTextInputValue("ModalFieldIndexField")))
          .inline = modalResponse.fields.getTextInputValue("ModalFieldInlineField") == "true" ? true : false

          await modalResponse.deferUpdate();
          await interaction.editReply({ embeds: [embed], components: [actionRowA, actionRowB, actionRowC] });
        }
        catch (err) {
          console.error('Error executing edit field embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedRemoveField") {
        const modal = new ModalBuilder()
        .setCustomId("ModalRemoveField")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalFieldIndexField")
            .setLabel("Field index (0-11)")
            .setMaxLength(2)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
          )
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalRemoveField" && i.user.id == interaction.user.id), time: 900_000 });
          if (!embed.data.fields.at(new Number(modalResponse.fields.getTextInputValue("ModalFieldIndexField")))) return interaction.reply('Invalid field value');
          embed.data.fields.splice(new Number(modalResponse.fields.getTextInputValue("ModalFieldIndexField")), 1);

          await modalResponse.deferUpdate();
          await interaction.editReply({ embeds: [embed], components: [actionRowA, actionRowB, actionRowC] });
        }
        catch (err) {
          console.error('Error executing delete field embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedSave") {
        const modal = new ModalBuilder()
        .setCustomId("ModalSave")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalNameField")
            .setLabel("Embed name")
            .setMaxLength(15)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
          )
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalSave" && i.user.id == interaction.user.id), time: 900_000 });
          await modalResponse.deferReply({ ephemeral: true });
          const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
          const embeddb = db.embeds.find(e => e.name == modalResponse.fields.getTextInputValue("ModalNameField"));
          if (!embeddb) {
            const premiumCheck = await require("../../tools/premiumCheck")(interaction.guild);
            if (db.embeds.length == 6 && !premiumCheck) return collected.reply({content:'Too many embeds. You can only have up to 6 embeds, 50 with plus.', ephemeral: true});
            if (db.embeds.length == 50) return collected.reply({content:'Too many embeds. You can only have up to 50 embeds.', ephemeral: true});

            db.embeds.push({
              name: modalResponse.fields.getTextInputValue("ModalNameField"),
              data: {
                author: {
                  name: embed.data.author?.name || null,
                  icon_url: embed.data.author?.icon_url || null,
                  url: embed.data.author?.url || null
                },
                title: embed.data.title || null,
                url: embed.data.url || null,
                description: embed.data.description || null,
                thumbnail: embed.data.thumbnail?.url || null,
                image: embed.data.image?.url || null,
                fields: embed.data.fields?.map(f => { return {name: f.name, value: f.value, inline: f.inline} }) || null,
                footer: {
                  text: embed.data.footer?.text || null,
                  icon_url: embed.data.footer?.icon_url || null,
                },
                timestamp: embed.data.timestamp || null
              }
            });
            await db.save();
            modalResponse.followUp({ content: `Saved! There's now ${db.embeds.length} / ${premiumCheck ? 50 : 6} embeds.`, ephemeral: true });
          } else {
            const premiumCheck = await require("../../tools/premiumCheck")(interaction.guild);
            db.embeds[await db.embeds.findIndex(e => e.name == modalResponse.fields.getTextInputValue("ModalNameField"))] = {
              name: modalResponse.fields.getTextInputValue("ModalNameField"),
              data: {
                author: {
                  name: embed.data.author?.name || null,
                  icon_url: embed.data.author?.icon_url || null,
                  url: embed.data.author?.url || null
                },
                title: embed.data.title || null,
                url: embed.data.url || null,
                description: embed.data.description || null,
                thumbnail: embed.data.thumbnail?.url || null,
                image: embed.data.image?.url || null,
                fields: embed.data.fields.map(f => { return {name: f.name, value: f.value, inline: f.inline} }) || null,
                footer: {
                  text: embed.data.footer?.text || null,
                  icon_url: embed.data.footer?.icon_url || null,
                },
                timestamp: embed.data.timestamp || null
              }
            }
            await db.save();
            modalResponse.followUp({ content: `Updated! There's ${db.embeds.length} / ${premiumCheck ? 50 : 6} embeds.`, ephemeral: true });
          }
        }
        catch (err) {
          console.error('Error executing delete field embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedLoad") {
        const modal = new ModalBuilder()
        .setCustomId("ModalLoad")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalNameField")
            .setLabel("Embed name")
            .setMaxLength(15)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
          )
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalLoad" && i.user.id == interaction.user.id), time: 900_000 });
          await modalResponse.deferReply({ ephemeral: true });
          const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
          const embeddb = db.embeds.find(e => e.name == modalResponse.fields.getTextInputValue("ModalNameField"));
          if (embeddb) {
            embed
            .setAuthor({
              name: embeddb.data.author?.name || null,
              iconURL: embeddb.data.author?.icon_url || null,
              url: embeddb.data.author?.url || null
            })
            .setTitle(embeddb.data.title || null)
            .setURL(embeddb.data.url || null)
            .setDescription(embeddb.data.description || null)
            .setThumbnail(embeddb.data.thumbnail || null)
            .setImage(embeddb.data.image || null)
            .setFields(embeddb.data.fields?.map(f => { return {name: f.name || `???`, value: f.value || `???`, inline: f.inline || false} }) || [])
            .setFooter({
              text: embeddb.data.footer.text || null,
              iconURL: embeddb.data.footer.icon_url || null
            })
            .setTimestamp(embeddb.data.timestamp || null)
            modalResponse.followUp({ content: `Embed loaded.`, ephemeral: true });
            await interaction.editReply({ embeds: [embed], components: [actionRowA, actionRowB, actionRowC] });
        } else modalResponse.followUp({ content: `That embed doesn't exist.`, ephemeral: true });
        }
        catch (err) {
          console.error('Error executing delete field embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedDelete") {
        const modal = new ModalBuilder()
        .setCustomId("ModalDelete")
        .setTitle("Embed Builder")
        .addComponents([
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
            .setCustomId("ModalNameField")
            .setLabel("Embed name")
            .setMaxLength(15)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
          )
        ])
        try {
          await collected.showModal(modal);
          const modalResponse = await collected.awaitModalSubmit({ filter: (i) => (i.customId == "ModalDelete" && i.user.id == interaction.user.id), time: 900_000 });
          await modalResponse.deferReply({ ephemeral: true });
          const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
          const embeddb = db.embeds.find(e => e.name == modalResponse.fields.getTextInputValue("ModalNameField"));
          if (embeddb) {
            db.embeds.splice(db.embeds.findIndex(e => e.name == modalResponse.fields.getTextInputValue("ModalNameField")), 1);
            modalResponse.followUp({ content: `Deleted. There's now ${db.embeds.length} / ${premiumCheck ? 50 : 6} embeds.`, ephemeral: true });
        } else modalResponse.followUp({ content: `That embed doesn't exist.`, ephemeral: true });
        }
        catch (err) {
          console.error('Error executing delete field embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      if (collected.customId == "EmbedList") {
        try {
          const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
          const premiumCheck = await require("../../tools/premiumCheck")(interaction.guild);
          await collected.reply({ content: `There are ${db.embeds.length} / ${premiumCheck ? 50 : 6} embeds registered in this server.\n\n### Embeds:\n${db.embeds.map(e => `\`${e.name}\``)}`, ephemeral: true });
        }
        catch (err) {
          console.error('Error executing delete field embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        }
      }
      
      if (collected.customId == "EmbedSend") {
        await message.channel.send({ embeds: [embed] }).then(async () => {
          await collector.dispose(interaction);
          await interaction.deleteReply();
        })
        .catch((err) => {
          console.error('Error executing send embed. ',err);
          interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
        })
      }
    });
  }

  /*async chatInputRun(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const embedraw = await interaction.options.getString("json");
    let channel = await interaction.options.getChannel("channel");
    if (!channel) channel = interaction.channel;

    const embed = new EmbedBuilder(await JSON.parse(embedraw))
    .setColor(Colors.Orange);

    channel.send({
        embeds: [embed]
    }).then(() => interaction.followUp(`${this.container.emojis.success} Successfully sent the message.`))
     .catch((e) => interaction.followUp(`${this.container.emojis.error} ${e}`));
  }*/

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputRun(interaction) {
    this.runEmbedBuilder(interaction);
  }

  /**
   * 
   * @param {Message} message
   */
  async messageRun(message) {
    const msg = await message.reply({ embeds: [{
      title: 'Embed Builder',
      description: 'Press the button below to launch the embed builder.',
      footer: {
        text: 'Prompt times out in 15 seconds'
      },
      color: Colors.Orange
    }], components: [
      new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
        .setCustomId(`EmbedBuilder`)
        .setLabel('Start')
        .setStyle(ButtonStyle.Secondary)
      )
    ] });
    const interaction = await msg.awaitMessageComponent({ filter: (i) => (i.customId == "EmbedBuilder" && i.user.id == message.author.id), time: 15_000 })
    .then((interaction) => {
      this.runEmbedBuilder(interaction);
      msg.edit({ embeds: [{
        title: 'Embed Builder',
        description: 'Press the button below to launch the embed builder.',
        footer: {
          text: 'You clicked it :D'
        },
        color: Colors.Orange
      }], components: [
        new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
          .setCustomId(`EmbedBuilder`)
          .setLabel('Start')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
        )
      ] });
    })
    .catch(() => {
      msg.edit({ embeds: [{
        title: 'Embed Builder',
        description: 'Press the button below to launch the embed builder.',
        footer: {
          text: 'Timed out'
        },
        color: Colors.Orange
      }], components: [
        new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
          .setCustomId(`EmbedBuilder`)
          .setLabel('Start')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
        )
      ] });
    });
  }
}
module.exports = {
  PingCommand,
};
