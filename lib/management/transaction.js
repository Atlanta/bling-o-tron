const { currency, spreadsheetId, language, prefix } = require('../../config.json');
const { ServerList, ServerLabel } = require('../../lib/wow/server');
const Economy = require('../../lib/utils/economy');

class NoTagException extends Error {}
class NoBoosterException extends Error {}
class BadServerException extends Error {}
class BadAmountException extends Error {}
class NoArgumentException extends Error {}

module.exports = class Transaction {
    /**
     * @param {Discord.Message} message 
     * 
     * @throws {BadServerException}
     */
    constructor(message) {
        const args = message.content.slice(prefix.length).split(/ +/).slice(1);

        console.log('Constructing transactions with args :', args);

        if (args.length < 1) {
            throw new NoArgumentException("You must provide some arguments to use this command.");
        }

        if (message.mentions.members.size < 1) {
            throw new NoTagException("Please tag one or more users.");
        }

        this.server = this.parseServer(args.shift());

        if (!this.server) {
            throw new BadServerException('Please provide a valid server.')
        }

        const taggedMembers = message.mentions.members;
        const lastArg = args.pop();
        const clientId = this.parseMember(lastArg);
        this.boosters = taggedMembers.clone();

        if (clientId) {
            this.client = message.mentions.members.get(clientId);
            this.boosters.delete(clientId);
        } else {
            args.push(lastArg);
        }

        if (this.boosters.size < 1) {
            throw new NoBoosterException("You must tag at least one booster !");
        }

        args.splice(0, this.boosters.size);

        try {
            this.amount = Economy.parseAmount(args.shift());
        } catch (error) {
            throw new BadAmountException("Please provide a valid amount !");
        }

        this.description = args.reduce((previous, current) => previous + ' ' + current, '');
        this.id = message.id;
    }

    /**
     * @param {string} str 
     */
    parseMember(str) {
       const pattern = /<@!?([0-9]+)>/;

       if (!str.match(pattern)) {
           return null;
       }

       return pattern.exec(str)[1];
    }

    /**
     * @param {string} str 
     */
    parseServer(str) {
       if (!ServerList.includes(str.toLowerCase())) {
           return null;
       }

       return str.toLowerCase();
    }

    getFormattedAmount() {
       return Intl.NumberFormat(language).format(this.amount);
    }
}