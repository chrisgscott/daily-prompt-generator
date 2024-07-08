const SibApiV3Sdk = require('@getbrevo/brevo');
require('dotenv').config();

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
let contactsApi = new SibApiV3Sdk.ContactsApi();

let apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY;

contactsApi.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;

async function addOrUpdateContactInBrevo(email, attributes) {
  const createContact = new SibApiV3Sdk.CreateContact();
  createContact.email = email;
  createContact.attributes = attributes;
  createContact.updateEnabled = true; // This allows updating existing contacts

  try {
    const result = await contactsApi.createContact(createContact);
    console.log('Contact added or updated in Brevo:', result);
    return result;
  } catch (error) {
    if (error.response && error.response.body && error.response.body.code === 'duplicate_parameter') {
      console.log('Contact already exists in Brevo, updating...');
      try {
        const updateContact = new SibApiV3Sdk.UpdateContact();
        updateContact.attributes = attributes;
        const updateResult = await contactsApi.updateContact(email, updateContact);
        console.log('Contact updated in Brevo:', updateResult);
        return updateResult;
      } catch (updateError) {
        console.error('Error updating contact in Brevo:', updateError);
        throw updateError;
      }
    } else {
      console.error('Error adding/updating contact in Brevo:', error);
      throw error;
    }
  }
}

async function sendEmailWithBrevo({ to, subject, text, html }) {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.sender = { 
    email: process.env.BREVO_SENDER_EMAIL || 'your-verified-sender@example.com', 
    name: process.env.BREVO_SENDER_NAME || 'Your App Name' 
  };
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.textContent = text;
  if (html) {
    sendSmtpEmail.htmlContent = html;
  }

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully. MessageId:', data.messageId);
    return data;
  } catch (error) {
    console.error('Error sending email with Brevo:', error);
    throw error;
  }
}

module.exports = { addOrUpdateContactInBrevo, sendEmailWithBrevo };