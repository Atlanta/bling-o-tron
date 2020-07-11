const Intl = require("intl");
const Keyv = require('keyv');
const Discord = require('discord.js');
const { google } = require('googleapis');
const i18n = require("../lib/utils/i18n");
const Economy = require('../lib/utils/economy');
const { authorize } = require('../security/google');
const { currency, spreadsheetId, language, prefix } = require('../config.json');
const { ServerList, ServerLabel } = require('../lib/wow/server');
const Transaction = require('../lib/management/transaction');
const { getBalance } = require('./bank');

module.exports = {
	name: 'inhouse',
    description: i18n.__('Manage transactions in Google Sheets.'),
    permission: 'ADMINISTRATOR',
    args: [
        '<server>',
        '<...@booster>',
        '<amount>',
        '[...description]',
        '[@client]',
    ],
    /**
     * @param {Discord.Message} message 
     * @param {string[]} args
     */
	async execute(message, args) {
        const db = new Keyv('sqlite://db/' + message.guild.id + '.sqlite');
        const customCurrency = (await db.get('config.currency')) || currency;
        const hasPermission = await this.hasPermission(message.member);
        /** @type {Transaction} transaction */
        let transaction;

        if (!hasPermission && !message.member.hasPermission('ADMINISTRATOR')) {
            return;
        }

        message.channel.startTyping();

        try {
            transaction = new Transaction(message);
        } catch (error) {
            message.channel.send(error.message);
            message.channel.stopTyping(true);
            return;
        }

        if (!transaction.client) {
            message.channel.send(i18n.__('Please tag a client.'));
            message.channel.stopTyping(true);
            return;
        }

        const balance = await getBalance(transaction.client);

        if (isNaN(balance[transaction.server]) || balance[transaction.server] < transaction.amount) {
            message.channel.send(i18n.__('The user\'s balance on this server is not high enough for this transaction.'));
            message.channel.stopTyping(true);
            return;
        }

        const confirmEmbed = new Discord.MessageEmbed()
            .setTitle(i18n.__('Please confirm transaction data'))
            .setDescription(i18n.__("Check your transaction informations with data below and react with ✅ to confirm transaction or with ⛔ to cancel."))
            .setAuthor(message.author.username, message.author.avatarURL())
            .setTimestamp(message.createdTimestamp)
            .setColor('ffb800')
            .addField('ID', `\`${transaction.id}\``)
            .addField(i18n.__('Amount'), transaction.getFormattedAmount() + ' ' + customCurrency, true)
            .addField(i18n.__('Server'), ServerLabel[transaction.server], true)
            .addField(i18n.__('Booster'), transaction.boosters.reduce((r, v) => `${r}\n${v.toString()}`), true)
            .addField(i18n.__('Client'), transaction.client ? transaction.client.toString() : 'Not specified', true)
            .addField(i18n.__('Description'), transaction.description);

        const confirmMessage = await message.channel.send(confirmEmbed);
        message.channel.stopTyping(true);
        confirmMessage.react('✅').then(() => confirmMessage.react('⛔'));
        const filter = (reaction, user) => { return ['✅', '⛔'].includes(reaction.emoji.name) && user.id === message.author.id };

        confirmMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(async collected => {
            const reaction = collected.first();

            if (reaction.emoji.name === '✅') {
                console.log("New transaction : ", transaction);

                if (transaction.boosters.size == 1) {
                    await this.addInhouse(message, transaction.boosters.first(), transaction.client, transaction.server, transaction.amount, transaction.description);
                } else {
                    await this.batchAddInhouse(message, transaction.boosters, transaction.client, transaction.server, transaction.amount, transaction.description);
                }

                await this.addInhouse(message, transaction.client, null, transaction.server, -transaction.amount, transaction.description);

                const newEmbed = confirmMessage.embeds[0].setTitle(i18n.__('In-house transaction created !'))
                    .setDescription('');

                confirmMessage.edit(newEmbed);
                confirmMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
            } else {
                message.delete().catch(error => console.error('Failed to delete transaction original message: ', error));
                confirmMessage.delete().catch(error => console.error('Failed to delete transaction confirm message: ', error));
            }
        })
        .catch(() => {
            message.delete().catch(error => console.error('Failed to delete transaction original message: ', error));
                confirmMessage.delete().catch(error => console.error('Failed to delete transaction confirm message: ', error));
        });
    },
    /**
     * @param {Discord.Message} message 
     * @param {Discord.GuildMember} member 
     * @param {Discord.GuildMember} client 
     * @param {string} server 
     * @param {number} amount 
     * @param {string} description 
     */
    async addInhouse(message, member, client, server, amount, description = '') {
        const sheets = google.sheets({version: 'v4', auth: await authorize()});

        const date = new Intl.DateTimeFormat(language, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(Date.now());

        const appendedRow = (await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Transactions!A:O',
            requestBody: {
                values: [[ message.id ]]
            },
            valueInputOption: 'USER_ENTERED'
        })).data;

        const appendedRowId = appendedRow.updates.updatedRange.match(/[0-9]+/)[0];
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Transactions!A${appendedRowId}:O${appendedRowId}`,
            requestBody: {
                values: [[
                    message.id,
                    message.member.user.id,
                    `=DGET(Bank!A:B; "Pseudo"; {"ID"; B${appendedRowId}})`,
                    member.id,
                    `=DGET(Bank!A:B; "Pseudo"; {"ID"; D${appendedRowId}})`,
                    client ? client.user.id : '',
                    client ? client.nickname : '',
                    ServerLabel[server],
                    date,
                    description,
                    amount,
                    '',
                    '',
                    `=K${appendedRowId}-L${appendedRowId}-M${appendedRowId}`,
                    'In-house - No cut'
                ]]
            },
            valueInputOption: 'USER_ENTERED'
        })

        return response;
    },
    /**
     * @param {Discord.Message} message 
     * @param {Discord.Collection<string, Discord.GuildMember>} members 
     * @param {Discord.GuildMember} client 
     * @param {string} server 
     * @param {number} amount 
     * @param {string} description 
     */
    async batchAddInhouse(message, members, client, server, amount, description = '') {
        for (const member of members.values()) {
            await this.addInhouse(message, member, client, server, amount / members.size, description);
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