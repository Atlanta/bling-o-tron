const Keyv = require('keyv');
const Discord = require('discord.js');
const { google } = require('googleapis');
const i18n = require("../lib/utils/i18n");
const Economy = require('../lib/utils/economy');
const { authorize } = require('../security/google');
const { currency, spreadsheetId } = require('../config.json');

module.exports = {
	name: 'transaction',
    description: i18n.__('Manage transactions in Google Sheets.'),
    permission: 'ADMINISTRATOR',
    args: [
        '<add>',
        '<show|edit|delete:id>',
        '<@player>',
        '<amount>',
       ' [...description]'
    ],
    actions: [
        'add',
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

        const [action, ...arguments] = args;

        switch (action) {
            case 'add':
                if (arguments.length < message.mentions.members.size + 1) return;

                message.channel.startTyping();

                if (message.mentions.members.size < 1) {
                    message.channel.send(i18n.__("Please tag one or more users."));
                    return;
                }

                const members = message.mentions.members;
                let amount;

                try {
                    amount = Economy.parseAmount(arguments[message.mentions.members.size]);
                } catch (error) {
                    message.channel.send(i18n.__('Please provide a valid amount !'));
                    return;
                }

                let description = arguments
                    .slice(message.mentions.members.size + 1, arguments.length)
                    .reduce((previous, current) => previous + ' ' + current, '');

                const formattedAmount = new Intl.NumberFormat('fr-FR').format(amount);

                if (members.size == 1) {
                    await this.addTransaction(message, members.first(), amount, description);
                    message.channel.send(i18n.__('Transaction created! ID: `{{id}}`. Amount: {{amount}} {{{currency}}}. Booster: {{{booster}}}', {
                        id: message.id,
                        amount: formattedAmount,
                        currency: customCurrency,
                        booster: members.first().toString()
                    }));
                } else {
                    await this.batchAddTransaction(message, members, amount, description);
                    message.channel.send(i18n.__('Transaction created! ID: `{{id}}`. Amount: {{amount}} {{{currency}}}. Boosters: {{{boosters}}}', {
                        id: message.id,
                        amount: formattedAmount,
                        currency: customCurrency,
                        boosters: members.reduce((r, v) => `${r} ${v.toString()}`, '')
                    }));
                }

                message.channel.stopTyping();
                break;

            default:
                return;
        }
    },
    /**
     * @param {Discord.Message} message 
     * @param {Discord.GuildMember} member 
     * @param {number} amount 
     * @param {string} description 
     */
    async addTransaction(message, member, amount, description = '') {
        const db = new Keyv('sqlite://db/' + message.guild.id + '.sqlite');
        const sheets = google.sheets({version: 'v4', auth: await authorize()});
        const cuts = await db.get('config.cuts') || {};
        const staffCut = await db.get('config.staffCut');

        let customCut = 0.0;
        let addedCuts = '';

        Object.keys(cuts).forEach(role => {
            if (message.member.roles.cache.has(role)) {
                customCut += cuts[role];
                addedCuts += `Cut ${message.guild.roles.resolve(role).name} : ${cuts[role]}% - `
            }
        });

        const date = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(Date.now());

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
                    member.id,
                    `=DGET(Bank!A:B; "Pseudo"; {"ID"; D${appendedRowId}})`,
                    date,
                    description,
                    amount,
                    `=H${appendedRowId}*${staffCut.toString().replace('.', ',')}/100`,
                    `=H${appendedRowId}*${customCut.toString().replace('.', ',')}/100`,
                    `=H${appendedRowId}-I${appendedRowId}-J${appendedRowId}`,
                    addedCuts
                ]]
            },
            valueInputOption: 'USER_ENTERED'
        })

        return response;
    },
    /**
     * @param {Discord.Message} message 
     * @param {Discord.Collection<string, Discord.GuildMember>} members 
     * @param {number} amount 
     * @param {string} description 
     */
    async batchAddTransaction(message, members, amount, description = '') {
        for (const member of members.values()) {
            await this.addTransaction(message, member, amount / members.size, description);
        }
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