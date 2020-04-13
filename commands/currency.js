const Keyv = require('keyv');
const Discord = require('discord.js');

module.exports = {
	name: 'currency',
    description: 'Get/set the currency icon for the whole server.',
    permission: 'ADMINISTRATOR',
    args: [
        '[new-currency]'
    ],
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        if (!message.member.hasPermission(this.permission)) {
            return;
        }

        const db = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite');

        if (args.length < 1) {
            const currency = await db.get('config.currency');
            message.channel.send('Currency: ' + currency + '.');

            return;
        }

        let currency = args[0];
        await db.set('config.currency', currency);

        message.channel.send('Currency set to ' + currency + ' for this server !');
	},
};