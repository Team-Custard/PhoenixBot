const { Listener, Events } = require("@sapphire/framework");
const { ApplicationCommandOptionType } = require("discord.js");
const { sendLog, logEmbed } = require("../../../tools/logging");

/** "/mod ban [user: 123] [reason: spam]" from an interaction. */
function describe(interaction) {
  const parts = [`/${interaction.commandName}`];
  let options = interaction.options.data;
  while (options.length === 1 && [ApplicationCommandOptionType.SubcommandGroup, ApplicationCommandOptionType.Subcommand].includes(options[0].type)) {
    parts.push(options[0].name);
    options = options[0].options ?? [];
  }
  for (const option of options) parts.push(`[${option.name}: ${option.value}]`);
  return parts.join(" ");
}

class InteractionCommandLogger extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "interactionCommandLogger", event: Events.ChatInputCommandFinish });
  }

  run(interaction, command) {
    if (!interaction.guild || interaction.user.bot) return undefined;
    const embed = logEmbed(
      interaction.user,
      `${interaction.user} executed the slash command ${command.name} in ${interaction.channel}\n**Interaction:**\n${describe(interaction)}`,
    );
    return sendLog(interaction.guild, "commands", { embeds: [embed] });
  }
}

module.exports = { InteractionCommandLogger };
