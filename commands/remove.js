const Keyv = require('keyv');
const Discord = require('discord.js');
const { currency } = require('../config.json');

module.exports = {
	name: 'remove',
    description: 'Remove money from user\'s bank balance.',
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        if (!message.member.hasPermission('ADMINISTRATOR')) {
            return;
        }

        if (args.length < 2) {
            message.channel.send('<@!' + message.author.id + '>, you\'re missing some arguments !');

            return;
        }

        const db = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite');
        const bank = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite', { namespace: 'bank' });

        let userTag = args[0];
        if (!userTag.startsWith('<@!')) {
            message.channel.send('Please tag someone !');

            return;
        }
        let user = userTag.substring(3, 21);

        const pattern = /([0-9]+)([kK]|[mM])?/;
        // let amount = parseInt(args[1]);
        if (!pattern.test(args[1])) {
            message.channel.send('Amount has an incorrect shape !');

            return;
        }
        const match = args[1].match(pattern);
        let amount = parseInt(match[1]);

        if (undefined !== match[2]) {
            switch (match[2].toLowerCase()) {
                case 'k':
                    amount *= 1000;
                    break;
    
                case 'm':
                    amount *= 1000000;
                    break;
            
                default:
                    break;
            }
        }

        let balance = await bank.get(user);
        if (undefined == balance) balance = 0;
        await bank.set(user, Math.max(parseInt(balance) - amount, 0));

        let customCurrency = await db.get('config.currency');
        message.channel.send(`Removed ${amount}${customCurrency || currency} from ${userTag}'s balance ! New balance : ${Math.max(parseInt(balance) - amount, 0)}${customCurrency || currency}`);
	},
};