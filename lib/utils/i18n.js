const { language } = require('../../config.json');
const i18n = require("i18n");

i18n.configure({
    locales: ['en-US', 'fr-FR'],
    directory: __dirname + '/../../locales',
    defaultLocale: 'en-US'
});
i18n.setLocale(language);

module.exports = i18n;