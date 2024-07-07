const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { Subscriber } = require('./models/subscriber');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

cron.schedule('0 0 * * *', async () => {
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

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: subscriber.email,
        subject: "Your Daily Journal Prompt",
        text: dailyPrompt,
      });

      await subscriber.update({ lastPromptSent: subscriber.lastPromptSent + 1 });
      console.log(`Daily prompt sent to subscriber: ${subscriber.id}`);
    } catch (error) {
      console.error(`Failed to send prompt to ${subscriber.email}:`, error);
    }
  }
});

console.log('Scheduler initialized');