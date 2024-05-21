const { Precondition } = require('@sapphire/framework');

class tagLockPrecondition extends Precondition {
  async messageRun(message) {
    // for Message Commands
    return this.checkOwner(message.author);
  }

  async chatInputRun(interaction) {
    // for Slash Commands
    return this.checkOwner(interaction.user);
  }

  async contextMenuRun(interaction) {
    // for Context Menu Command
    return this.checkOwner(interaction.user);
  }

  async checkOwner(member) {
    return member.id == require('../config.json').ownerId
      ? this.ok()
      : this.error({ message: 'This command is developer only.' });
  }
}
module.exports = {
  tagLockPrecondition
};