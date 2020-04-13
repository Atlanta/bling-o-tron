const Keyv = require('keyv');
const Discord = require('discord.js');

module.exports = {
	name: 'welcome-role',
    description: 'Get/set a role to automatically apply to new users.',
    permission: 'ADMINISTRATOR',
    args: [
        '[@role]'
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
            const role = await db.get('config.welcomeRole');

            if (!role) {
                message.channel.send('No role will be attribued to new users.');
            } else {
                message.channel.send('Role ' + role + ' will be attribued to new users.');
            }

            return;
        }

        const role = args[0];

        if (!role.match(/<@&[0-9]{18}>/g)) {
            message.channel.send('Please tag a valid role !');

            return;
        }

        await db.set('config.welcomeRole', role.substr(3, 18));

        message.channel.send('Welcome role set to ' + role + '.');
	},
};