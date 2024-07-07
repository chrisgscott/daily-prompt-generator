const Queue = require('bull');
const OpenAI = require("openai");
const { Subscriber } = require('./models/subscriber');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  }
};

const promptGenerationQueue = new Queue('promptGeneration', redisConfig);

promptGenerationQueue.process(async (job) => {
    const { subscriberId, categories, goal } = job.data;
    console.log('Starting prompt generation for subscriber:', subscriberId);
  
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: `Generate 365 personalized journal prompts for a user interested in ${categories.join(', ')} with the goal of ${goal}. Each prompt should be no more than 150 characters long. Return the prompts as a valid JSON array of objects, each with a 'prompt' field. For example: [{"prompt":"First prompt here"},{"prompt":"Second prompt here"}]`
        }],
      });
  
      console.log('Raw OpenAI API response:', response.choices[0].message.content);
  
      let prompts;
      try {
        prompts = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        // Attempt to clean the response and parse again
        const cleanedResponse = response.choices[0].message.content.replace(/\n/g, '').replace(/\r/g, '').trim();
        prompts = JSON.parse(`[${cleanedResponse.split('}').join('},').slice(0, -1)}]`);
      }
  
      if (!Array.isArray(prompts)) {
        throw new Error('Parsed result is not an array');
      }
  
      console.log('OpenAI API response received, number of prompts:', prompts.length);
  
      const subscriber = await Subscriber.findByPk(subscriberId);
      if (subscriber) {
        await subscriber.update({ prompts: JSON.stringify(prompts) });
        console.log('Prompts saved for subscriber:', subscriberId);
      } else {
        console.error('Subscriber not found:', subscriberId);
      }
  
      console.log('Prompt generation completed for subscriber:', subscriberId);
      return prompts;
    } catch (error) {
      console.error('Error in prompt generation:', error);
      throw error;
    }
  });

module.exports = { promptGenerationQueue };