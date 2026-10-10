// Routing for the client advisor. The advisor grew graded rails first; the support bot copied
// an earlier version of them.
import { readFileSync } from "node:fs";
import { POLICY } from "../../../shared/rails.js";

const config = JSON.parse(readFileSync(new URL("../config.json", import.meta.url), "utf8"));
const FLOOR = config.floor ?? 0.75;
const MID_HI = 0.8;

export function route(result, event) {
  if (!result) return { tag: "infra", why: "no result from brain" };

  if (result.action === "escalate") {
    if (POLICY.infraSentinels.includes(result.reason)) return { tag: "infra", why: result.reason };
    return { tag: "escalate", why: result.reason || "operator input needed" };
  }

  if (event.draftOnly) return { tag: "draft_hold", why: "manual hold" };

  let conf = Number(result.confidence);
  if (Number.isNaN(conf)) conf = FLOOR;
  if (conf < FLOOR) return { tag: "low_conf", why: `conf ${conf} below ${FLOOR}` };

  const longVoice = event.isVoice && String(event.text || "").length > 200;
  if ((longVoice || conf < MID_HI) && result.understanding) {
    return { tag: "confirm", why: longVoice ? "long voice" : `mid-conf ${conf}` };
  }
  return { tag: "reply", why: `conf ${conf}` };
}
