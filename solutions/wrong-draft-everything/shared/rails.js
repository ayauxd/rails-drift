// shared/rails.js: helpers shared by the Slack agents.
// Started as an extraction of the advisor's routing rails. The routing itself still lives in
// each worker's src/route.js; only the wording helpers and the policy file are shared so far.

import { readFileSync } from "node:fs";

export const POLICY = JSON.parse(readFileSync(new URL("./policy.json", import.meta.url), "utf8"));

export const TEMP_ISSUE_TEXT =
  "Sorry, I'm having a temporary problem reaching my tools. I'll try again in a moment.";

export function confirmText(understanding) {
  return `Just to check I have this right: ${understanding}. Is that right?`;
}

export function wordCount(s) {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}
