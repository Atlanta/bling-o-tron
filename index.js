const fs = require('fs');
const Keyv = require('keyv');
const readline = require('readline');
const Discord = require('discord.js');
const {google} = require('googleapis');
const { currency, prefix, token } = require('./config.json');

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', async message => {
	const db = new Keyv('sqlite://db/' + message.guild.id.toString() + '.sqlite');

    let guildPrefix = (await db.get('config.prefix')) || prefix;
	if (!message.content.startsWith(guildPrefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

	if (!client.commands.has(command)) return;

	try {
		client.commands.get(command).execute(message, args);
	} catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}
});

client.on('guildCreate', guild => {
	const db = new Keyv('sqlite://db/' + guild.id + '.sqlite');
});

client.on('guildMemberAdd', async guildMember => {
    const db = new Keyv('sqlite://db/' + guildMember.guild.id + '.sqlite');
    const role = await db.get('config.welcomeRole');

    if (role) {
        guildMember.roles.add(role)
        .catch((reason) => {
            console.error(reason);
            guildMember.guild.systemChannel.send('Hey! Bling-o-tron tried to set a role to a new user, but it failed. Please check that the bot role ("Bling-o-tron") is higher than the role the bot is trying to add.');
        });
    }
});

client.login(token)