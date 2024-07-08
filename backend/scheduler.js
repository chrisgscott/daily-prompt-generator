const cron = require('node-cron');
const { Subscriber } = require('./models/subscriber');
const { sendEmailWithBrevo } = require('./brevoService');

cron.schedule('0 0 * * *', async () => {
  console.log('Running daily email task');
  try {
    const subscribers = await Subscriber.findAll();
    console.log(`Found ${subscribers.length} subscribers`);
    
    for (const subscriber of subscribers) {
      console.log(`Processing subscriber ${subscriber.id}: ${subscriber.email}`);
      try {
        let prompts = [];
        try {
          prompts = JSON.parse(subscriber.prompts);
          console.log(`Parsed ${prompts.length} prompts for subscriber ${subscriber.id}`);
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
        console.log(`Selected prompt for subscriber ${subscriber.id}: "${dailyPrompt}"`);

        console.log(`Attempting to send email to ${subscriber.email}`);
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
        console.error(`Failed to process subscriber ${subscriber.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in daily email task:', error);
  }
});

console.log('Scheduler initialized');