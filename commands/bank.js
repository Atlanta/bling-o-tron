const Keyv = require('keyv');
const Discord = require('discord.js');
const {google} = require('googleapis');
const { authorize } = require('../security/google');
const { currency, googleToken, spreadsheetId } = require('../config.json');

module.exports = {
    name: 'bank',
    description: 'Shows your personnal bank balance.',
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
        let user = 0;

        // User wants his account
        if (args.length === 0) {
            user = message.author.id;
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

            user = userTag.substring(3, 21);
        }

        const authClient = await authorize();
        const sheets = google.sheets({version: 'v4', auth: authClient});
        sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Bank!A2:C',
        }, (err, res) => {
            if (err) {
                message.channel.send(`Oops, an error happened. Please retry later. If the problem persist, please contact the support about this!`);
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
                    message.channel.send(`No record was found for this user.`);

                    return;
                }

                const balance = row[2];
                message.channel.send(`<@!${user}>'s balance: ${balance}${customCurrency || currency}`);
            } else {
                message.channel.send(`Oops, an error happened. Please retry later. If the problem persist, please contact the support about this!`);
                console.log('No data found in spreadsheet.');
            }
        });
    },
};