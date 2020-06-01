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
        let user = 0;

        // User wants his account
        if (args.length === 0) {
            user = message.author.id;
        } else { // Now he wants someone else account
            // But only if he has permissions !
            if (!message.member.hasPermission('ADMINISTRATOR')) {
                return;
            }

            if (message.mentions.users.length == 0) {
                message.channel.send(i18n.__('Please tag someone !'));
                return;
            }

            user = message.mentions.users.first().id;
        }

        const authClient = await authorize();
        const sheets = google.sheets({version: 'v4', auth: authClient});
        sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Bank!A2:G',
            valueRenderOption: 'UNFORMATTED_VALUE'
        }, (err, res) => {
            if (err) {
                message.channel.send(i18n.__("Oops, an error happened. Please retry later. If the problem persist, please contact the support about this!"));
                console.error('An error happened while using Google API: ', err);
                return;
            }
            /** @type {string[][]} rows */
            const rows = res.data.values;
            if (rows.length) {
                const row = rows.find(row => {
                    return row[0] == user;
                });

                if (!row) {
                    message.channel.send(i18n.__("No record was found for this user."));

                    return;
                }

                const balance = {
                    total: new Intl.NumberFormat(language).format(parseInt(row[3])),
                    hyjal: new Intl.NumberFormat(language).format(parseInt(row[4])),
                    ysondre: new Intl.NumberFormat(language).format(parseInt(row[5])),
                    archimonde: new Intl.NumberFormat(language).format(parseInt(row[6])),
                }

                const embed = new Discord.MessageEmbed()
                    .setTitle(i18n.__("Your bank"))
                    // .setAuthor(message.author.username, message.author.avatarURL())
                    .setTimestamp(message.createdTimestamp)
                    .setColor('ffb800')
                    .addField(i18n.__('Hyjal'), `${balance.hyjal} ${customCurrency}`, true)
                    .addField(i18n.__('Ysondre'), `${balance.ysondre} ${customCurrency}`, true)
                    .addField(i18n.__('Archimonde'), `${balance.archimonde} ${customCurrency}`, true)
                    .addField(i18n.__('Total'), `${balance.total} ${customCurrency}`);

                message.channel.send({reply: message.author, embed});
            } else {
                message.channel.send(i18n.__("Oops, an error happened. Please retry later. If the problem persist, please contact the support about this!"));
                console.log('No data found in spreadsheet.');
            }
        });
    },
};