const Keyv = require('keyv');
const Discord = require('discord.js');
const { currency } = require('../config.json');

module.exports = {
	name: 'bank-channel',
    description: 'Set allowed channels for !bank command on this server.',
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        if (!message.member.hasPermission('ADMINISTRATOR')) {
            return;
        }

        const db = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite');

        if (args.length === 0) {
            /** @type {string[]} authorizedChannels */
            const authorizedChannels = (await db.get('config.bankChannel')) || [];

            if (authorizedChannels.length === 0) {
                message.channel.send('No channel is configured !');
                return;
            }

            let response = 'These channels can use the `bank` command :\n';
            authorizedChannels.forEach(channel => {
                response += '- ' + channel + '\n'
            });

            message.channel.send(response);
            return;
        }

        if (args.length < 2) {
            message.channel.send('<@!' + message.author.id + '>, you\'re missing some arguments !');
            return;
        }

        const channel = args[1];

        if (!channel.startsWith('<#')) {
            message.channel.send('Please tag a channel !');
            return;
        }

        /** @type {string[]} authorizedChannels */
        const authorizedChannels = (await db.get('config.bankChannel')) || [];

        switch (args[0].toLowerCase()) {
            case 'add':
                if (authorizedChannels.includes(channel)) {
                    message.channel.send(channel + ' is already an authorized channel !');
                    return;
                }

                authorizedChannels.push(channel);
                await db.set('config.bankChannel', authorizedChannels);

                message.channel.send(channel + ' can now use the `bank` command !');
                break;

            case 'remove':
                if (!authorizedChannels.includes(channel)) {
                    message.channel.send(channel + ' is not an authorized channel !');
                    return;
                }

                authorizedChannels.splice(authorizedChannels.indexOf(channel), 1);
                await db.set('config.bankChannel', authorizedChannels);
                message.channel.send(channel + ' can\'t use the `bank` command anymore !');
                break;

            default:
                message.channel.send('Statement must be `add` or `delete` !');
                return;
        }
	},
};