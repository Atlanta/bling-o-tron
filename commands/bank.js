const Intl = require("intl");
const Keyv = require('keyv');
const Discord = require('discord.js');
const {google} = require('googleapis');
const i18n = require("../lib/utils/i18n");
const { authorize } = require('../security/google');
const { currency, spreadsheetId, language } = require('../config.json');

module.exports = {
    name: 'bank',
    description: i18n.__("Shows your personnal bank balance."),
    args: [
        '[@user]'
    ],
    /**
    * @param {Discord.Message} message 
    * @param {string[]} args
    */
    async execute(message, args) {
        const db = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite');

        const authorizedChannels = (await db.get('config.bankChannel')) || [];

        if (!authorizedChannels.includes('<#' + message.channel.id + '>')) {
            let errorMessage;
            if (authorizedChannels.length < 1) {
                errorMessage = await message.channel.send(i18n.__('Sorry <@{{authorId}}>, you cannot use this command right now.', {authorId: message.author.id}));
            } else if (authorizedChannels.length === 1) {
                errorMessage = await message.channel.send(i18n.__('Hey <@{{authorId}}> ! Please use the `bank` command in the {{authorizedChannel}} channel !', {authorId: message.author.id, authorizedChannel: authorizedChannels[0]}));
            } 
            if (authorizedChannels.length > 1) {
                let response = i18n.__('Hey <@{{authorId}}> ! Please use the `bank` command in one of these channels :\n', {authorId: message.author.id});
                authorizedChannels.forEach(channel => {
                    response += '- ' + channel + '\n';
                });
                errorMessage = await message.channel.send(response);
            }

            await message.delete();
            setTimeout(() => errorMessage.delete(), 10000);

            return;
        }

        const customCurrency = await db.get('config.currency') || currency;
        const member = message.mentions.users.length > 0 && message.member.hasPermission('ADMINISTRATOR') ? message.mentions.members.first() : message.guild.member(message.author.id);

        try {
            const balance = await this.getBalance(member);

            if (!balance) {
                message.channel.send(i18n.__("No record was found for this user."));
            } else {
                const formattedBalance = {
                    total: new Intl.NumberFormat(language).format(parseInt(balance.total)),
                    hyjal: new Intl.NumberFormat(language).format(parseInt(balance.hyjal)),
                    archimonde: new Intl.NumberFormat(language).format(parseInt(balance.archimonde)),
                }

                const embed = new Discord.MessageEmbed()
                    .setTitle(i18n.__("Your bank"))
                    .setTimestamp(message.createdTimestamp)
                    .setColor('ffb800')
                    .addField(i18n.__('Hyjal'), `${formattedBalance.hyjal} ${customCurrency}`, true)
                    .addField(i18n.__('Archimonde'), `${formattedBalance.archimonde} ${customCurrency}`, true)
                    .addField(i18n.__('Total'), `${formattedBalance.total} ${customCurrency}`);

                message.channel.send({reply: message.author, embed});
            }
        } catch (err) {
            message.channel.send(i18n.__("Oops, an error happened. Please retry later. If the problem persist, please contact the support about this!"));
            console.error('An error happened while using Google API: ', err);
            return;
        }
    },
    /**
     * 
     * @param {Discord.GuildMember} member 
     */
    async getBalance(member) {
        const authClient = await authorize();
        const sheets = google.sheets({version: 'v4', auth: authClient});

        try {
            const response = (await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'Bank!A2:G',
                valueRenderOption: 'UNFORMATTED_VALUE'
            })).data;

            /** @type {string[][]} rows */
            const rows = response.values;
            const row = rows.find(row => {
                return row[0] == member.id;
            });

            if (!row) return undefined;

            const balance = {
                total: parseInt(row[3]),
                hyjal: parseInt(row[4]),
                archimonde: parseInt(row[6]),
            }

            return balance;
        } catch (err) {
            console.error(err);
            throw new Error('Error while fetching Bank informations.');
        }
    }
};