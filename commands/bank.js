const Keyv = require('keyv');
const Discord = require('discord.js');
const { currency } = require('../config.json');

module.exports = {
	name: 'bank',
    description: 'Shows your personnal bank balance.',
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        const db = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite');
        const bank = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite', { namespace: 'bank' });

        const authorizedChannels = (await db.get('config.bankChannel')) || [];

        if (!authorizedChannels.includes('<#' + message.channel.id + '>')) {
            let errorMessage;
            if (authorizedChannels.length < 1) {
                errorMessage = await message.channel.send('Sorry <@' + message.author.id + '>, you cannot use this command right now.');
            } else if (authorizedChannels.length === 1) {
                errorMessage = await message.channel.send('Hey <@' + message.author.id + '> ! Please use the `bank` command in the ' + authorizedChannels[0] + ' channel !');
            } 
            if (authorizedChannels.length > 1) {
                let response = 'Hey <@' + message.author.id + '> ! Please use the `bank` command in one of these channels :\n';
                authorizedChannels.forEach(channel => {
                    response += '- ' + channel + '\n';
                });
                errorMessage = await message.channel.send(response);
            }

            await message.delete();
            setTimeout(() => errorMessage.delete(), 10000);

            return;
        }

        const customCurrency = await db.get('config.currency');

        // User wants his account
        if (args.length === 0) {
            let balance = await bank.get(message.author.id);

            if (undefined == balance) {
                await bank.set(message.author.id, 0);
                balance = 0;
            }

            console.debug(message.author.tag + ' (' + message.author.id + ') asked for his balance : ' + balance);
            message.channel.send('Your balance: ' + balance + (customCurrency || currency));
        } else { // Now he wants someone else account
            // But only if he has permissions !
            if (!message.member.hasPermission('ADMINISTRATOR')) {
                return;
            }

            let userTag = args[0];
            if (!userTag.startsWith('<@!')) {
                message.channel.send('Please tag someone !');

                return;
            }

            let user = userTag.substring(3, 21);
            let balance = await bank.get(user);
            if (undefined == balance) balance = 0;

            console.debug(message.author.tag + ' (' + message.author.id + ') asked for ' + user + ' balance : ' + balance);
            message.channel.send(message.guild.member(user).user.tag + '\'s balance: ' + balance.toString() + (customCurrency || currency));
        }
	},
};