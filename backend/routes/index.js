const express = require("express");
const router = express.Router();
const { Subscriber } = require("../models/subscriber");
const OpenAI = require("openai");
const nodemailer = require("nodemailer");
const { promptGenerationQueue } = require('../queueProcessor');
const { addContactToBrevo } = require('../brevoService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/subscribe", async (req, res) => {
    try {
      const { email, firstname, categories, goal } = req.body;
      
      // Basic validation
      if (!email || !categories || !goal) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
  
      console.log("Attempting to create subscriber with:", { email, firstname, categories, goal });
      const subscriber = await Subscriber.create({ email, firstname, categories, goal });
      console.log("Subscriber created, queueing prompt generation for subscriber:", subscriber.toJSON());
      
      await promptGenerationQueue.add({ subscriberId: subscriber.id, categories, goal });
  
      // Add subscriber to Brevo as a contact
      try {
        await addContactToBrevo(email, {
          FIRSTNAME: firstname,
          CATEGORIES: categories.join(','),
          GOAL: goal
        });
        console.log("Subscriber added to Brevo contacts");
      } catch (brevoError) {
        console.error("Error adding subscriber to Brevo contacts:", brevoError);
      }
  
      res.status(201).json({
        message: "Subscription successful. Prompts will be generated shortly.",
        subscriberId: subscriber.id
      });
    } catch (error) {
      console.error("Subscription error:", error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'Email already subscribed' });
      }
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  });

router.post("/send-daily-prompt", async (req, res) => {
  try {
    const { subscriberId } = req.body;
    const subscriber = await Subscriber.findByPk(subscriberId);

    if (!subscriber) {
      return res.status(404).json({ error: "Subscriber not found" });
    }

    let prompts = [];
    try {
      prompts = JSON.parse(subscriber.prompts);
    } catch (error) {
      console.error('Error parsing prompts:', error);
      return res.status(500).json({ error: 'Error retrieving prompts' });
    }

    const promptIndex = subscriber.lastPromptSent % prompts.length;
    const prompt = prompts[promptIndex].prompt;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: subscriber.email,
      subject: "Your Daily Journal Prompt",
      text: prompt,
    });

    await subscriber.update({ lastPromptSent: subscriber.lastPromptSent + 1 });

    res.status(200).json({ message: "Daily prompt sent successfully" });
  } catch (error) {
    console.error("Error in send-daily-prompt route:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/subscriber/:id/prompts', async (req, res) => {
  try {
    const subscriber = await Subscriber.findByPk(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    let prompts = [];
    try {
      prompts = JSON.parse(subscriber.prompts);
    } catch (error) {
      console.error('Error parsing prompts:', error);
      return res.status(500).json({ error: 'Error retrieving prompts' });
    }
    res.json({ prompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function for email validation
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

module.exports = router;