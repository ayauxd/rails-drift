import { test } from "node:test";
import assert from "node:assert/strict";
import { handleTurn } from "../workers/advisor-bot/src/index.js";
import { TEMP_ISSUE_TEXT } from "../shared/rails.js";
import { makeCtx, names, traceTag, turn } from "./helpers.js";

test("advisor: high-confidence answer goes to the member", async () => {
  const ctx = makeCtx();
  await handleTurn(turn(), { action: "reply", reply: "Renewal is due in March.", confidence: 0.9, understanding: "when the credential renews" }, ctx);
  assert.deepEqual(names(ctx), ["send", "setAwaitingConfirm"]);
  assert.equal(traceTag(ctx), "reply");
});

test("advisor: a stamped model outage is an infra notice, not a page", async () => {
  const ctx = makeCtx();
  await handleTurn(turn(), { action: "escalate", reply: "", confidence: 0, understanding: "", reason: "model/api issue" }, ctx);
  assert.deepEqual(names(ctx), ["notice", "send"]);
  assert.equal(ctx.calls.find((c) => c[0] === "send")[2], TEMP_ISSUE_TEXT);
  assert.equal(traceTag(ctx), "infra");
});

test("advisor: below its own floor is parked as a draft", async () => {
  const ctx = makeCtx();
  await handleTurn(turn(), { action: "reply", reply: "Probably form B.", confidence: 0.72, understanding: "which bid form to use" }, ctx);
  assert.deepEqual(names(ctx), ["draft"]);
  assert.equal(traceTag(ctx), "low_conf");
});

test("advisor: a real escalation pages the operator", async () => {
  const ctx = makeCtx();
  await handleTurn(turn(), { action: "escalate", reply: "", confidence: 0, understanding: "contract change", reason: "needs a signature" }, ctx);
  assert.deepEqual(names(ctx), ["page"]);
  assert.equal(traceTag(ctx), "escalate");
});
