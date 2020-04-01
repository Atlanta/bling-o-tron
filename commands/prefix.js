const Keyv = require('keyv');
const Discord = require('discord.js');

module.exports = {
	name: 'prefix',
    description: 'Set commands prefix for this server.',
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        if (!message.member.hasPermission('ADMINISTRATOR')) {
            return;
        }

        if (args.length < 1) {
            message.channel.send('Argument missing !');
            return;
        }

        const db = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite');

        let prefix = args[0];
        if (prefix.length > 1) {
            prefix = prefix.charAt(0);
        }
        await db.set('config.prefix', prefix);

        message.channel.send('Prefix set to `' + prefix + '` !');
	},
};