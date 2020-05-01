const Keyv = require('keyv');
const Discord = require('discord.js');

module.exports = {
	name: 'transaction-role',
    description: 'Get/set allowed roles for `!transaction` command on this server.',
    args: [
        '[add|remove]',
        '[@role]'
    ],
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        if (!message.member.hasPermission('ADMINISTRATOR')) {
            return;
        }

        const db = new Keyv('sqlite://db/' + message.guild.id + '.sqlite');

        if (args.length === 0) {
            /** @type {string[]} authorizedRoles */
            const authorizedRoles = (await db.get('config.transactionRole')) || [];

            if (authorizedRoles.length === 0) {
                message.channel.send('No role is configured !');
                return;
            }

            let response = 'These roles can use the `transaction` command :\n';
            authorizedRoles.forEach(role => {
                response += '- <@&' + role + '>\n'
            });

            message.channel.send(response);
            return;
        }

        if (args.length < 2) {
            message.channel.send('<@!' + message.author.id + '>, you\'re missing some arguments !');
            return;
        }

        if (message.mentions.roles.size != 1) {
            message.channel.send('Please tag a role !');
            return;
        }

        const action = args[0];
        const role = message.mentions.roles.first();

        /** @type {string[]} authorizedRoles */
        const authorizedRoles = (await db.get('config.transactionRole')) || [];

        switch (action.toLowerCase()) {
            case 'add':
                if (authorizedRoles.includes(role.id)) {
                    message.channel.send('<@&' + role + '> is already an authorized role !');
                    return;
                }

                authorizedRoles.push(role.id);
                await db.set('config.transactionRole', authorizedRoles);

                message.channel.send('<@&' + role + '> can now use the `transaction` command !');
                break;

            case 'remove':
                if (!authorizedRoles.includes(role.id)) {
                    message.channel.send('<@&' + role + '> is not an authorized role !');
                    return;
                }

                authorizedRoles.splice(authorizedRoles.indexOf(role.id), 1);
                await db.set('config.transactionRole', authorizedRoles);
                message.channel.send('<@&' + role + '> can\'t use the `transaction` command anymore !');
                break;

            default:
                message.channel.send('Statement must be `add` or `delete` !');
                return;
        }
	},
};