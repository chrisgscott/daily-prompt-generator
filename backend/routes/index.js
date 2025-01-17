const express = require("express");
const router = express.Router();
const { Subscriber } = require("../models/subscriber");
const OpenAI = require("openai");
const { promptGenerationQueue } = require("../queueProcessor");
const {
  addOrUpdateContactInBrevo,
  sendEmailWithBrevo,
} = require("../brevoService");
const { body, validationResult } = require("express-validator");
const { OPENAI_PROMPT_TEMPLATE } = require('../constants');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post(
  "/subscribe",
  [
    body("email").isEmail().normalizeEmail(),
    body("firstname").trim().escape(),
    body("categories").isArray(),
    body("goal").trim().escape(),
    body("timeZone").trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, firstname, categories, goal, timeZone } = req.body;

    try {
      let subscriber = await Subscriber.findOne({ where: { email } });
      let isNewSubscriber = false;

      if (subscriber) {
        subscriber = await subscriber.update({
          firstname,
          categories,
          goal,
          timeZone,
        });
      } else {
        subscriber = await Subscriber.create({
          email,
          firstname,
          categories,
          goal,
          timeZone,
        });
        isNewSubscriber = true;
      }

      if (isNewSubscriber) {
        await promptGenerationQueue.add({
          subscriberId: subscriber.id,
          categories,
          goal,
        });
      }

      try {
        await addOrUpdateContactInBrevo(email, {
          FIRSTNAME: firstname,
          CATEGORIES: categories.join(","),
          GOAL: goal,
        });
        console.log("Subscriber added/updated in Brevo contacts");
      } catch (brevoError) {
        console.error(
          "Error adding/updating subscriber in Brevo contacts:",
          brevoError
        );
      }

      res.status(isNewSubscriber ? 201 : 200).json({
        message: isNewSubscriber
          ? "Subscription successful. Prompts will be generated shortly."
          : "Subscription updated successfully.",
        subscriberId: subscriber.id,
      });
    } catch (error) {
      console.error("Subscription error:", error);
      res
        .status(500)
        .json({
          error: "An unexpected error occurred. Please try again later.",
        });
    }
  }
);

router.post("/generate-prompts", async (req, res) => {
    try {
      const { subscriberId } = req.body;
      const subscriber = await Subscriber.findByPk(subscriberId);
  
      if (!subscriber) {
        return res.status(404).json({ error: "Subscriber not found" });
      }
  
      console.log("Starting prompt generation for subscriber:", subscriberId);
      
      const prompt = OPENAI_PROMPT_TEMPLATE
        .replace('{count}', '365')
        .replace('{categories}', subscriber.categories.join(', '))
        .replace('{goal}', subscriber.goal);
  
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: prompt,
          },
        ],
      });
  
      const prompts = JSON.parse(response.choices[0].message.content);
      await subscriber.update({ prompts: JSON.stringify(prompts) });
  
      console.log("Prompt generation completed for subscriber:", subscriberId);
      res.status(200).json({ message: "Prompts generated successfully" });
    } catch (error) {
      console.error("Error in prompt generation:", error);
      res.status(500).json({ error: error.message });
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
      console.error("Error parsing prompts:", error);
      return res.status(500).json({ error: "Error retrieving prompts" });
    }

    const promptIndex = subscriber.lastPromptSent % prompts.length;
    const prompt = prompts[promptIndex].prompt;

    try {
      await sendEmailWithBrevo({
        to: subscriber.email,
        subject: "Your Daily Journal Prompt",
        text: prompt,
        html: `<h1>Your Daily Journal Prompt</h1><p>${prompt}</p>`,
      });
      console.log(`Daily prompt sent to ${subscriber.email}`);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return res.status(500).json({ error: "Error sending daily prompt" });
    }

    await subscriber.update({ lastPromptSent: subscriber.lastPromptSent + 1 });

    res.status(200).json({ message: "Daily prompt sent successfully" });
  } catch (error) {
    console.error("Error in send-daily-prompt route:", error);
    res
      .status(500)
      .json({ error: "An unexpected error occurred. Please try again later." });
  }
});

router.get("/subscriber/:id/prompts", async (req, res) => {
  try {
    const subscriber = await Subscriber.findByPk(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ error: "Subscriber not found" });
    }
    let prompts = [];
    try {
      prompts = JSON.parse(subscriber.prompts);
    } catch (error) {
      console.error("Error parsing prompts:", error);
      return res.status(500).json({ error: "Error retrieving prompts" });
    }
    res.json({ prompts });
  } catch (error) {
    console.error("Error fetching prompts:", error);
    res
      .status(500)
      .json({ error: "An unexpected error occurred. Please try again later." });
  }
});

module.exports = router;
