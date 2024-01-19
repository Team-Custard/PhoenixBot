const { Precondition } = require('@sapphire/framework');
const database = require("../Tools/SettingsSchema");
const { ownerid } = require('../settings.json');

class ModOnlyPrecondition extends Precondition {
    async messageRun(message) {
        // for Message Commands
        return this.checkOwner(message.author.id);
    }
    async checkOwner(userID) {
        return userID == ownerid
          ? this.ok()
          : this.error({ message: 'This command is bot owner only.' });
    }
}
module.exports = {
  ModOnlyPrecondition
};