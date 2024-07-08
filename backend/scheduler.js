const cron = require('node-cron');
const { Subscriber } = require('./models/subscriber');
const sendPromptEmail = require('./emailSender');

// Schedule the job to run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily email task');
  const subscribers = await Subscriber.findAll();
  
  for (const subscriber of subscribers) {
    try {
      let prompts = [];
      try {
        prompts = JSON.parse(subscriber.prompts);
      } catch (error) {
        console.error(`Error parsing prompts for subscriber ${subscriber.id}:`, error);
        continue;
      }

      if (prompts.length === 0) {
        console.log(`No prompts available for subscriber ${subscriber.id}`);
        continue;
      }

      const promptIndex = subscriber.lastPromptSent % prompts.length;
      const dailyPrompt = prompts[promptIndex].prompt;

      // Use the new sendPromptEmail function
      await sendPromptEmail(subscriber.email, dailyPrompt);

      await subscriber.update({ lastPromptSent: subscriber.lastPromptSent + 1 });
      console.log(`Daily prompt sent to subscriber: ${subscriber.id}`);
    } catch (error) {
      console.error(`Failed to send prompt to ${subscriber.email}:`, error);
    }
  }
});

console.log('Scheduler initialized');