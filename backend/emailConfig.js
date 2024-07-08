const SibApiV3Sdk = require('@getbrevo/brevo');
require('dotenv').config();

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

let apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY;

module.exports = { apiInstance, SibApiV3Sdk };