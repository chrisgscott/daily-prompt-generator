// constants.js

const OPENAI_PROMPT_TEMPLATE = `Generate exactly {count} personalized journal prompts for a user interested in {categories} with the goal of {goal}. Each prompt should be no more than 150 characters long and designed to be used in the morning. The prompts should encourage introspection, self-reflection, creativity, and personal growth. Ensure a mix of prompts that include open-ended questions, gratitude exercises, and goal-setting reflections relevant to the chosen categories. Avoid returning prompts that feel like tasks. Instead, we should focus on prompts that are clearly intended to help the reader write a daily journal entry based on everything we've discussed. Return ONLY a valid JSON array with each object containing a 'prompt' field.`;

module.exports = {
  OPENAI_PROMPT_TEMPLATE
};