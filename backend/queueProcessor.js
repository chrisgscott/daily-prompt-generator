const Queue = require("bull");
const OpenAI = require("openai");
const { Subscriber } = require("./models/subscriber");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
};

const promptGenerationQueue = new Queue("promptGeneration", redisConfig);

async function generatePrompts(categories, goal, count) {
    let allPrompts = [];
    const batchSize = 100;  // Adjust based on what works best
  
    while (allPrompts.length < count) {
      const promptsToGenerate = Math.min(batchSize, count - allPrompts.length);
      console.log(`Generating ${promptsToGenerate} prompts...`);
  
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: `Generate exactly ${promptsToGenerate} personalized journal prompts for a user interested in ${categories.join(', ')} with the goal of ${goal}. Each prompt should be no more than 150 characters long. Return ONLY a valid JSON array with each object containing a 'prompt' field, without any markdown formatting or explanation.`
        }],
        max_tokens: 2048,
        temperature: 0.7,
      });
  
      let newPrompts;
      try {
        let content = response.choices[0].message.content.trim();
        // Remove any non-JSON content after the array
        content = content.replace(/\][^]*$/, ']');
        // Remove any markdown code block formatting
        if (content.startsWith('```') && content.endsWith('```')) {
          content = content.slice(content.indexOf('\n')+1, content.lastIndexOf('\n')).trim();
        }
        // Ensure the content starts and ends with square brackets
        if (!content.startsWith('[')) content = '[' + content;
        if (!content.endsWith(']')) content = content + ']';
        
        // Remove any incomplete JSON at the end
        content = content.replace(/,\s*}?\s*$/, '') + ']';
        
        newPrompts = JSON.parse(content);
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        console.log("Raw response:", response.choices[0].message.content);
        
        // Attempt to extract valid JSON objects
        const jsonObjects = response.choices[0].message.content.match(/\{[^{}]*\}/g);
        if (jsonObjects) {
          try {
            newPrompts = jsonObjects.map(obj => JSON.parse(obj));
          } catch (secondParseError) {
            console.error("Error parsing extracted JSON objects:", secondParseError);
            throw new Error("Unable to parse prompts from API response");
          }
        } else {
          throw new Error("No valid JSON found in API response");
        }
      }
  
      if (!Array.isArray(newPrompts)) {
        throw new Error("Parsed result is not an array");
      }
  
      allPrompts = allPrompts.concat(newPrompts);
      console.log(`Generated ${allPrompts.length} prompts so far...`);
    }
  
    return allPrompts.slice(0, count);  // Ensure we return exactly the number requested
  }

  promptGenerationQueue.process(async (job) => {
    const { subscriberId, categories, goal } = job.data;
    console.log("Starting prompt generation for subscriber:", subscriberId);
  
    try {
      let prompts = [];
      let attempts = 0;
      const maxAttempts = 3;
  
      while (prompts.length < 365 && attempts < maxAttempts) {
        try {
          const newPrompts = await generatePrompts(categories, goal, 365 - prompts.length);
          prompts = prompts.concat(newPrompts);
        } catch (error) {
          console.error(`Attempt ${attempts + 1} failed:`, error);
          attempts++;
        }
      }
  
      if (prompts.length < 365) {
        throw new Error(`Failed to generate 365 prompts after ${maxAttempts} attempts`);
      }
  
      console.log("Final number of prompts generated:", prompts.length);
  
      const subscriber = await Subscriber.findByPk(subscriberId);
      if (subscriber) {
        await subscriber.update({ prompts: JSON.stringify(prompts) });
        console.log("Prompts saved for subscriber:", subscriberId);
      } else {
        console.error("Subscriber not found:", subscriberId);
      }
  
      console.log("Prompt generation completed for subscriber:", subscriberId);
      return prompts;
    } catch (error) {
      console.error("Error in prompt generation:", error);
      throw error;
    }
  });

promptGenerationQueue.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed. Generated ${result.length} prompts.`);
});

promptGenerationQueue.on("failed", (job, err) => {
  console.log(`Job ${job.id} failed with error:`, err);
});

module.exports = { promptGenerationQueue };
