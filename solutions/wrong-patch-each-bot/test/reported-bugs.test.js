import { test } from "node:test";
import assert from "node:assert/strict";
import * as support from "../workers/support-bot/src/index.js";
import * as advisor from "../workers/advisor-bot/src/index.js";
import { makeCtx, names, traceTag, turn } from "./helpers.js";

test("support: an outage is not paged as an escalation", async () => {
  const ctx = makeCtx();
  await support.handleTurn(turn(), null, ctx);
  assert.deepEqual(names(ctx), ["notice", "send"]);
});

test("support: a reply with no confidence is not parked as low confidence", async () => {
  const ctx = makeCtx();
  await support.handleTurn(turn(), { action: "reply", reply: "x", understanding: "y" }, ctx);
  assert.notEqual(traceTag(ctx), "low_conf");
});

test("advisor: does not ask again after the member confirmed", async () => {
  const ctx = makeCtx();
  await advisor.handleTurn(turn({ awaitingConfirm: true }), { action: "reply", reply: "x", confidence: 0.77, understanding: "y" }, ctx);
  assert.equal(traceTag(ctx), "reply");
});
