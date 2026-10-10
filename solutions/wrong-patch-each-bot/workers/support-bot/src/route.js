// Routing for the cohort support bot: decide what to do with one brain result.
import { wordCount } from "../../../shared/rails.js";

// Outages show up as escalations whose reason mentions the API, the model or a timeout.
const INFRA = /api|model|timeout|console/i;

export function route(result, event) {
  if (!result) return { tag: "infra", why: "no result from brain" };
  if (result.action === "escalate") {
    if (INFRA.test(result.reason || "")) return { tag: "infra", why: result.reason };
    return { tag: "escalate", why: result.reason || "operator input needed" };
  }
  if (event.draftOnly) return { tag: "draft_hold", why: "manual hold" };

  // A reply with no confidence is answerable; treat it as the floor instead of 0.
  const conf = typeof result.confidence === "number" ? result.confidence : 0.7;
  if (conf < 0.7) return { tag: "low_conf", why: `conf ${conf} below 0.7` };

  const longVoice = event.isVoice && wordCount(event.text) >= 40;
  if (!event.awaitingConfirm && (longVoice || conf < 0.8) && result.understanding) {
    return { tag: "confirm", why: longVoice ? "long voice" : `mid-conf ${conf}` };
  }
  return { tag: "reply", why: `conf ${conf}` };
}
