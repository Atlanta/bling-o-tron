const Keyv = require('keyv');
const Discord = require('discord.js');

module.exports = {
	name: 'rules',
    description: 'Get/set the rules of the server.',
    permission: 'ADMINISTRATOR',
    args: [
        '[#channel]'
    ],
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        if (!message.mentions.channels.size) {
            await this.sendRules(message.member);

            return;
        }

        if (!message.member.hasPermission(this.permission)) {
            return;
        }

        const channel = message.mentions.channels.first();

        if (channel.type != 'text') return;

        const db = new Keyv('sqlite://db/' + message.guild.id + '.sqlite');
        db.set('config.rulesChannel', channel.id);

        message.channel.send('Rules channel set to <#' + channel + '>.');
    },
    /**
     * @param {Discord.GuildMember} member 
     */
    async sendRules(member) {
        const guild = member.guild;
        const db = new Keyv('sqlite://db/' + guild.id + '.sqlite');

        const channelID = await db.get('config.rulesChannel');
        /** @type {Discord.TextChannel} */
        const channel = guild.channels.resolve(channelID);

        if (!channel) {
            return;
        }

        const channelMessages = await channel.messages.fetch();
        const messages = [];
        channelMessages.forEach(m => messages.unshift(m))
        messages.map(async m => await member.send(m));
    }
};