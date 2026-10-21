const { Precondition } = require("@sapphire/framework");

// Sapphire's ClientPermissions check, except slash commands and context menus skip
// the permissions that only replying needs (see PhoenixCommand). Added by
// PhoenixCommand for commands that also work outside the bot's servers.
class PhoenixClientPermissions extends Precondition {
  get core() {
    return this.container.stores.get("preconditions").get("ClientPermissions");
  }

  messageRun(message, command, context) {
    return this.core.messageRun(message, command, { permissions: context.permissions });
  }

  chatInputRun(interaction, command, context) {
    if (!context.slashPermissions?.bitfield) return this.ok();
    return this.core.chatInputRun(interaction, command, { permissions: context.slashPermissions });
  }

  contextMenuRun(interaction, command, context) {
    if (!context.slashPermissions?.bitfield) return this.ok();
    return this.core.contextMenuRun(interaction, command, { permissions: context.slashPermissions });
  }
}

module.exports = { PhoenixClientPermissions };
