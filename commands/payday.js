const Keyv = require('keyv');
const Discord = require('discord.js');

module.exports = {
	name: 'payday',
    description: 'Get/set the next payday date.',
    permission: 'ADMINISTRATOR',
    args: [
        '[next-payday]'
    ],
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        const db = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite');

        if (args.length < 1) {
            const payday = await db.get('config.payday');
            message.channel.send('Next payday: ' + payday + '.');

            return;
        }

        if (!message.member.hasPermission(this.permission)) {
            return;
        }

        let payday = args[0];
        await db.set('config.payday', payday);

        message.channel.send('Next payday set to ' + payday + '.');
	},
};