const Keyv = require('keyv');
const Discord = require('discord.js');

module.exports = {
	name: 'staff-cut',
    description: 'Get/set the mandatory cut for staff.',
    permission: 'ADMINISTRATOR',
    args: [
        '[cut]'
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
            const cut = await db.get('config.staffCut');

            if (!cut) {
                message.channel.send('No staff cut is configured.');
                return;
            }

            message.channel.send(`Staff cut is defined to ${cut}%.`);
            return;
        }

        let cut = args[0];
        if (isNaN(cut) || parseFloat(cut) < 0) {
            message.channel.send('Please provide a valid percentage.');
            return;
        }

        cut = parseFloat(cut);
        await db.set('config.staffCut', cut);
        message.channel.send(`Staff cut set to ${cut}%.`);
    }
};