const fs = require('fs');
const util = require('util');
const {google} = require('googleapis');
const readline = require('readline-promise').default;
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const credentials = require('../credentials.json');

const rlp = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});


// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = './token.json';
  
/**
 * Create an OAuth2 client.
 */
async function authorize() {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    let oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    try {
        const token = await readFile(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
    } catch (err) {
        oAuth2Client = await getNewToken(oAuth2Client);
    }

    return oAuth2Client;
}

/**
 * Get and store new token after prompting for user authorization.
 * @param {google.auth.OAuth2Client} oAuth2Client The OAuth2 client to get token for.
 */
async function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);

    const code = await rlp.questionAsync('Enter the code from that page here: ');
    const token = await oAuth2Client.getToken(code);

    oAuth2Client.setCredentials(token.tokens);

    try {
        writeFile(TOKEN_PATH, JSON.stringify(token.tokens));
    } catch (err) {
        return console.error(err);
    }

    console.log('Token stored to', TOKEN_PATH);

    return oAuth2Client;
}

module.exports = { authorize };