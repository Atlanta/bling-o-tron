const Keyv = require('keyv');
const Discord = require('discord.js');
const { google } = require('googleapis');
const i18n = require("../lib/utils/i18n");
const Economy = require('../lib/utils/economy');
const { authorize } = require('../security/google');
const { currency, spreadsheetId, language } = require('../config.json');

module.exports = {
	name: 'advance',
    description: i18n.__("Adds an advance in Google Sheets."),
    permission: 'ADMINISTRATOR',
    args: [
        '<add>',
    ],
    actions: [
        'add',
    ],
    aliases: [
        'accompte'
    ],
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        const db = new Keyv('sqlite://db/' + message.guild.id + '.sqlite');
        const customCurrency = (await db.get('config.currency')) || currency;
        const hasPermission = await this.hasPermission(message.member);

        if (!hasPermission && !message.member.hasPermission('ADMINISTRATOR')) {
            return;
        }

        // no arg, return
        if (args.length < 1) {
            return;
        }

        const [requestedAmount, ...desc] = args;

        message.channel.startTyping();

        try {
            amount = Economy.parseAmount(requestedAmount);
        } catch (error) {
            message.channel.send(i18n.__("Please provide a valid amount !"));
            return;
        }

        let description = desc.reduce((previous, current) => previous + ' ' + current, '');
        await this.addAdvance(message, amount, description);

        const formattedAmount = new Intl.NumberFormat(language).format(amount);
        message.channel.send(i18n.__("Advance created! ID: `{{id}}`. Amount: {{amount}} {{{currency}}}", {id: message.id, amount: formattedAmount, currency: customCurrency}));
        message.channel.stopTyping();
    },
    /**
     * @param {Discord.Message} message 
     * @param {number} amount 
     * @param {string} description 
     */
    async addAdvance(message, amount, description = '') {
        const sheets = google.sheets({version: 'v4', auth: await authorize()});

        const date = new Intl.DateTimeFormat(language, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(Date.now());

        const appendedRow = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Transactions!A1:L',
            requestBody: {
                values: [[ message.id ]]
            },
            valueInputOption: 'USER_ENTERED'
        });

        const appendedRowId = appendedRow.data.updates.updatedRange.match(/[0-9]+/)[0];
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Transactions!A${appendedRowId}:L`,
            requestBody: {
                values: [[
                    message.id,
                    message.member.user.id,
                    `=DGET(Bank!A:B; "Pseudo"; {"ID"; B${appendedRowId}})`,
                    2,
                    `=DGET(Bank!A:B; "Pseudo"; {"ID"; D${appendedRowId}})`,
                    date,
                    description,
                    '',
                    '',
                    '',
                    amount
                ]]
            },
            valueInputOption: 'USER_ENTERED'
        })

        return response;
    },
    /**
     * 
     * @param {Discord.GuildMember} member 
     */
    async hasPermission(member) {
        const db = new Keyv('sqlite://db/' + member.guild.id + '.sqlite');

        /** @type {string[]} authorizedRoles */
        const authorizedRoles = await db.get('config.transactionRole') || [];

        for (const role of authorizedRoles) {
            if (member.roles.cache.has(role)) {
                return true;
            }
        }

        return false;
    }
};