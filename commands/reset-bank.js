const Keyv = require('keyv');
const Discord = require('discord.js');
const { currency } = require('../config.json');

module.exports = {
	name: 'reset-bank',
    description: 'Reset all users accounts.',
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        if (!message.member.hasPermission('ADMINISTRATOR')) {
            return;
        }

        const bank = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite', { namespace: 'bank' });

        const confirm = await message.channel.send('**ALL USERS WILL SEE THEIR BALANCE RESET TO 0.** Please confirm by reacting 💥 to this message.');
        await confirm.react('💥');

        const filter = (reaction, user) => {
            return reaction.emoji.name == '💥' && user.id === message.author.id;
        }

        confirm.awaitReactions(filter, { max: 1, time: 10000, errors: ['time']})
        .then(async collected => {
            await confirm.delete();

            await bank.clear();

            message.channel.send('Bank has been reset !');
            console.log('Bank has been reset !');
        })
        .catch(async collected => {
            await confirm.delete();
        });
	},
};