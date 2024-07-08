require('dotenv').config();
const { Subscriber } = require('./models/subscriber');
const sendPromptEmail = require('./emailSender');

async function testEmailSend(subscriberId) {
  try {
    const subscriber = await Subscriber.findByPk(subscriberId);
    if (!subscriber) {
      console.error('Subscriber not found');
      return;
    }

    console.log('Subscriber found:', subscriber.toJSON());

    let prompts;
    try {
      prompts = JSON.parse(subscriber.prompts);
      console.log(`Parsed ${prompts.length} prompts`);
    } catch (error) {
      console.error('Error parsing prompts:', error);
      return;
    }

    if (!Array.isArray(prompts) || prompts.length === 0) {
      console.error('Prompts is not an array or is empty');
      return;
    }

    const promptIndex = subscriber.lastPromptSent % prompts.length;
    console.log('Prompt index:', promptIndex);

    const dailyPrompt = prompts[promptIndex].prompt;
    if (!dailyPrompt) {
      console.error('No prompt found at index:', promptIndex);
      return;
    }

    console.log('Daily prompt:', dailyPrompt);

    console.log('Attempting to send email...');
    try {
      const result = await sendPromptEmail(subscriber.email, dailyPrompt);
      console.log('Test email sent successfully');
      console.log('Email send result:');
      console.log('  Message ID:', result.body.messageId);
      console.log('  Status Code:', result.response.statusCode);
      console.log('  Status Message:', result.response.statusMessage);
    } catch (emailError) {
      console.error('Error sending email:', emailError.message);
      if (emailError.response) {
        console.error('Error details:', JSON.stringify(emailError.response.body, null, 2));
      }
    }
  } catch (error) {
    console.error('Error in test email process:', error);
  } finally {
    process.exit();
  }
}

// Usage: node testEmailSend.js 1
const subscriberId = process.argv[2];
if (!subscriberId) {
  console.error('Please provide a subscriber ID');
  process.exit(1);
}

testEmailSend(subscriberId);