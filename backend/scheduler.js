const cron = require('node-cron');
const { Subscriber } = require('./models/subscriber');
const { sendEmailWithBrevo } = require('./brevoService');
const moment = require('moment-timezone');
const { Op } = require('sequelize');

// Target time for sending emails 
const targetHour = 6; // 6 AM in 24-hour format
const targetMinute = 0; // 00 minutes past the hour

// Run every hour on the hour
cron.schedule('0 * * * *', async () => {
  console.log('Running email check');
  const now = moment();

  const matchingTimezones = moment.tz.names().filter(tz => {
    const time = now.tz(tz);
    console.log(`Checking timezone: ${tz}, Local time: ${time.format('HH:mm')}`);
    return time.hours() === targetHour && time.minutes() === targetMinute;
  });

  console.log(`Matching timezones: ${matchingTimezones}`);

  try {
    const subscribers = await Subscriber.findAll({
      where: {
        timeZone: {
          [Op.in]: matchingTimezones
        }
      }
    });

    console.log(`Found ${subscribers.length} subscribers to send emails to`);

    for (const subscriber of subscribers) {
      try {
        await sendDailyPrompt(subscriber);
      } catch (error) {
        console.error(`Failed to send prompt to ${subscriber.email}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in email scheduler:', error);
  }
});

async function sendDailyPrompt(subscriber) {
  console.log(`Processing subscriber ${subscriber.id}: ${subscriber.email}`);
  
  let prompts = [];
  try {
    prompts = JSON.parse(subscriber.prompts);
    console.log(`Parsed ${prompts.length} prompts for subscriber ${subscriber.id}`);
  } catch (error) {
    console.error(`Error parsing prompts for subscriber ${subscriber.id}:`, error);
    return;
  }

  if (prompts.length === 0) {
    console.log(`No prompts available for subscriber ${subscriber.id}`);
    return;
  }

  const promptIndex = subscriber.lastPromptSent % prompts.length;
  const dailyPrompt = prompts[promptIndex].prompt;
  console.log(`Selected prompt for subscriber ${subscriber.id}: "${dailyPrompt}"`);

  try {
    const emailResult = await sendEmailWithBrevo({
      to: subscriber.email,
      subject: "Your Daily Journal Prompt",
      text: dailyPrompt,
      html: `
        <html>
          <body>
            <h1>Your Daily Journal Prompt</h1>
            <p>${dailyPrompt}</p>
            <p>Happy journaling!</p>
          </body>
        </html>
      `
    });
    console.log(`Email sent to ${subscriber.email}. Result:`, emailResult);

    await subscriber.update({ lastPromptSent: subscriber.lastPromptSent + 1 });
    console.log(`Updated lastPromptSent for subscriber ${subscriber.id} to ${subscriber.lastPromptSent + 1}`);
  } catch (error) {
    console.error(`Error sending email to ${subscriber.email}:`, error);
    throw error;
  }
}

console.log('Scheduler initialized');
