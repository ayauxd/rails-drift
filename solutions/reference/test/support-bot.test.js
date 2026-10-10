import { test } from "node:test";
import assert from "node:assert/strict";
import { handleTurn } from "../workers/support-bot/src/index.js";
import { makeCtx, names, traceTag, turn } from "./helpers.js";

test("support: high-confidence answer goes to the member", async () => {
  const ctx = makeCtx();
  await handleTurn(turn(), { action: "reply", reply: "Use Share > Invite.", confidence: 0.95, understanding: "how to share a project" }, ctx);
  assert.deepEqual(names(ctx), ["send", "setAwaitingConfirm"]);
  assert.equal(ctx.calls.find((c) => c[0] === "send")[2], "Use Share > Invite.");
  assert.equal(traceTag(ctx), "reply");
});

test("support: a real escalation pages the operator", async () => {
  const ctx = makeCtx();
  await handleTurn(turn(), { action: "escalate", reply: "", confidence: 0, understanding: "refund request", reason: "needs refund approval" }, ctx);
  assert.deepEqual(names(ctx), ["page"]);
  assert.equal(traceTag(ctx), "escalate");
});

test("support: low confidence is parked as a draft", async () => {
  const ctx = makeCtx();
  await handleTurn(turn(), { action: "reply", reply: "Maybe try settings?", confidence: 0.3, understanding: "export settings" }, ctx);
  assert.deepEqual(names(ctx), ["draft"]);
  assert.equal(traceTag(ctx), "low_conf");
});

test("support: mid confidence restates and asks to confirm", async () => {
  const ctx = makeCtx();
  await handleTurn(turn(), { action: "reply", reply: "Open Billing.", confidence: 0.75, understanding: "where to change the card on file" }, ctx);
  assert.deepEqual(names(ctx), ["send", "setAwaitingConfirm"]);
  assert.equal(ctx.calls.find((c) => c[0] === "setAwaitingConfirm")[2], true);
  assert.equal(traceTag(ctx), "confirm");
});
