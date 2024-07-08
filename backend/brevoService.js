const { contactsApi, SibApiV3Sdk } = require('./emailConfig');

async function addContactToBrevo(email, attributes) {
  const createContact = new SibApiV3Sdk.CreateContact();
  createContact.email = email;
  createContact.attributes = attributes;

  try {
    const result = await contactsApi.createContact(createContact);
    console.log('Contact added to Brevo:', result);
    return result;
  } catch (error) {
    console.error('Error adding contact to Brevo:', error);
    throw error;
  }
}

module.exports = { addContactToBrevo };