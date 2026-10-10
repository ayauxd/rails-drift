// shared/rails.js: the one implementation of docs/POLICY.md used by every Slack agent.
//
// Each worker passes its own config.json; anything it does not override comes from policy.json.
// Thresholds live only in those two files, so changing them changes behavior with no code edit.

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

// Merge an agent's overrides onto the shared defaults. Sentinels are shared only.
export function resolvePolicy(agentConfig = {}, shared = POLICY) {
  const pick = (k) => (agentConfig[k] !== undefined ? agentConfig[k] : shared[k]);
  return {
    floor: pick("floor"),
    midHi: pick("midHi"),
    voiceConfirmWords: pick("voiceConfirmWords"),
    infraSentinels: shared.infraSentinels.map((s) => String(s).toLowerCase()),
  };
}

// A usable confidence is a finite number in [0, 1]. Anything else on a reply falls back to the
// floor, which puts the reply on the confirm-first path: never a hard hold, never a blind send.
export function effectiveConfidence(result, policy) {
  const c = result.confidence;
  return typeof c === "number" && Number.isFinite(c) && c >= 0 && c <= 1 ? c : policy.floor;
}

// An outage must not look like a question the agent could not answer.
export function isInfraFailure(result, policy) {
  if (!result) return true;
  if (result.action !== "escalate") return false;
  const reason = String(result.reason || "").toLowerCase();
  return policy.infraSentinels.some((s) => reason.includes(s));
}

// The decision order from docs/POLICY.md. Returns { tag, why }.
export function decideDisposition(event, result, policy) {
  if (isInfraFailure(result, policy)) return { tag: "infra", why: result ? result.reason || "infra" : "no result from brain" };
  if (result.action === "escalate") return { tag: "escalate", why: result.reason || "operator input needed" };
  if (event.draftOnly) return { tag: "draft_hold", why: "manual hold" };

  const conf = effectiveConfidence(result, policy);
  if (conf < policy.floor) return { tag: "low_conf", why: `conf ${conf} below floor ${policy.floor}` };

  const longVoice = Boolean(event.isVoice) && wordCount(event.text) >= policy.voiceConfirmWords;
  if (!event.awaitingConfirm && (conf < policy.midHi || longVoice)) {
    if (String(result.understanding || "").trim()) {
      return { tag: "confirm", why: longVoice ? "long voice" : `mid-conf ${conf}` };
    }
    return { tag: "low_conf", why: "confirmation needed but nothing to restate" };
  }
  return { tag: "reply", why: `conf ${conf}` };
}

// Carry out a disposition through ctx, exactly as the outcome table in docs/POLICY.md requires.
export function applyDisposition({ tag, why }, event, result, ctx) {
  ctx.trace(tag, why);
  switch (tag) {
    case "infra":
      ctx.notice("infra", why);
      ctx.send(event.memberId, TEMP_ISSUE_TEXT);
      return;
    case "escalate":
      ctx.page(why);
      return;
    case "draft_hold":
    case "low_conf":
      ctx.draft(result.reply, { why });
      return;
    case "confirm":
      ctx.send(event.memberId, confirmText(result.understanding));
      ctx.setAwaitingConfirm(event.memberId, true);
      return;
    case "reply":
      ctx.send(event.memberId, result.reply);
      ctx.setAwaitingConfirm(event.memberId, false);
      return;
  }
  throw new Error(`unknown disposition ${tag}`);
}

export function handleWithPolicy(agentConfig, event, result, ctx) {
  const policy = resolvePolicy(agentConfig);
  applyDisposition(decideDisposition(event, result, policy), event, result, ctx);
}
