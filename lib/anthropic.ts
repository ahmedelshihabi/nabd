import Anthropic from "@anthropic-ai/sdk";

// The API key is read from the environment and never shipped to the client.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Default model for campaign generation; override via env if needed.
export const CAMPAIGN_MODEL = process.env.CAMPAIGN_MODEL || "claude-sonnet-5-5";
