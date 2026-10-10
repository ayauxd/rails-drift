// Routing for the cohort support bot: decide what to do with one brain result.
import { wordCount } from "../../../shared/rails.js";

export function route(result, event) {
  if (event.draftOnly) return { tag: "draft_hold", why: "manual hold" };

  if (!result || result.action === "escalate") {
    return { tag: "escalate", why: (result && result.reason) || "no result from brain" };
  }

  const conf = typeof result.confidence === "number" ? result.confidence : 0;
  if (conf < 0.7) return { tag: "low_conf", why: `conf ${conf} below 0.7` };

  const longVoice = event.isVoice && wordCount(event.text) > 40;
  if (!event.awaitingConfirm && (longVoice || conf < 0.8) && result.understanding) {
    return { tag: "confirm", why: longVoice ? "long voice" : `mid-conf ${conf}` };
  }
  return { tag: "reply", why: `conf ${conf}` };
}
