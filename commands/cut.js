const Keyv = require('keyv');
const Discord = require('discord.js');

module.exports = {
	name: 'cut',
    description: 'Get/set the cut on transactions for specified roles.',
    permission: 'ADMINISTRATOR',
    args: [
        '[@role] [cut]'
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

        if (args.length === 0) {
            /** @type {Object} cut */
            const cuts = await db.get('config.cuts');

            if (!cuts || Object.keys(cuts).length === 0) {
                message.channel.send('No cut is configured.');
                return;
            }

            let response = 'These roles get the following cut :\n';
            Object.keys(cuts).forEach(role => {
                response += '- <@&' + role + '>: ' + cuts[role] + '%\n'
            });

            message.channel.send(response);
            return;
        }

        if (message.mentions.roles.size != 1) {
            message.channel.send('Please tag exactly one role.');
            return;
        }

        let cut = args[1];
        if (isNaN(cut) || parseFloat(cut) < 0) {
            message.channel.send('Please provide a valid percentage.');
            return;
        }

        cut = parseFloat(cut);
        let cuts = await db.get('config.cuts') || {};

        if (cut == 0) {
            delete cuts[message.mentions.roles.first().id];
            db.set('config.cuts', cuts);
            message.channel.send(`Removed cut for role ${message.mentions.roles.first()} !`);
        } else {
            cuts[message.mentions.roles.first().id] = cut;
            db.set('config.cuts', cuts);
            message.channel.send(`Cut set to ${cut}% for role ${message.mentions.roles.first()} !`);
        }
    }
};