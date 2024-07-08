const { apiInstance, SibApiV3Sdk } = require('./emailConfig');
const generateEmailContent = require('./emailTemplate');

async function sendPromptEmail(email, prompt) {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.to = [{ email: email }];
  sendSmtpEmail.sender = { email: 'hello@dailyjournalprompts.co', name: 'Daily Journal Prompts' };
  sendSmtpEmail.subject = 'Your Daily Journal Prompt';
  sendSmtpEmail.htmlContent = generateEmailContent(prompt);

  try {
    console.log('Attempting to send email to:', email);
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully. MessageId:', data.messageId);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = sendPromptEmail;