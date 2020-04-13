const fs = require('fs');
const Discord = require('discord.js');

module.exports = {
	name: 'help',
    description: 'Shows all available commands.',
    alias: [
        'commands'
    ],
    args: [],
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	execute(message, args) {
        const embed = new Discord.MessageEmbed()
            .setTitle('Commands')
            .setThumbnail(message.client.user.avatarURL())
            .setDescription('<required parameter> [optional parameter] ...multiple parameter')
        ;

        const client = message.client;
        client.commands = new Discord.Collection();

        const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(`./${file}`);
            client.commands.set(command.name, command);
        }

        client.commands.forEach(command => {
            let aliases = '';

            if (command.alias) {
                command.alias.forEach(alias => {
                    aliases += `\`${alias}\` `;
                });
            }

            let args = command.args ? command.args.join(' ') : '';

            embed.addField(
                '`!' + command.name + (args !== '' ? ' ' + args : '') + '`',
                (aliases !== '' ? '*Alias:* ' + aliases + '\n' : '') + command.description
            );
        });
        message.channel.send(embed);
    }
};