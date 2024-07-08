// constants.js

const OPENAI_PROMPT_TEMPLATE = `Generate exactly {count} personalized journal prompts for a user interested in {categories} with the goal of {goal}. Each prompt should be no more than 150 characters long. Return ONLY a valid JSON array with each object containing a 'prompt' field.`;

module.exports = {
  OPENAI_PROMPT_TEMPLATE
};