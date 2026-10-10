// Regression tests for the reported bugs, exercised through each worker's handleTurn.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as support from "../workers/support-bot/src/index.js";
import * as advisor from "../workers/advisor-bot/src/index.js";
import { makeCtx, names, traceTag, turn } from "./helpers.js";

const bots = { support, advisor };
const reply = (o = {}) => ({ action: "reply", reply: "The answer.", confidence: 0.95, understanding: "how to share a project", reason: "", ...o });

for (const [name, bot] of Object.entries(bots)) {
  test(`${name}: an API outage is an infra notice, never a page`, async () => {
    for (const result of [null, { action: "escalate", reply: "", confidence: 0, understanding: "", reason: "API Error: 529 overloaded" }]) {
      const ctx = makeCtx();
      await bot.handleTurn(turn({ draftOnly: true }), result, ctx);
      assert.deepEqual(names(ctx), ["notice", "send"]);
      assert.equal(traceTag(ctx), "infra");
    }
  });

  test(`${name}: a real escalation pages even for a member on hold`, async () => {
    const ctx = makeCtx();
    await bot.handleTurn(turn({ draftOnly: true }), { action: "escalate", reply: "", confidence: 0, understanding: "", reason: "needs refund approval" }, ctx);
    assert.deepEqual(names(ctx), ["page"]);
  });

  test(`${name}: missing or unusable confidence goes to confirm-first, not the draft queue`, async () => {
    for (const confidence of [undefined, null, "0.9", Number.NaN, 85, -0.2]) {
      const ctx = makeCtx();
      await bot.handleTurn(turn(), reply({ confidence }), ctx);
      assert.equal(traceTag(ctx), "confirm", `confidence ${String(confidence)}`);
    }
  });

  test(`${name}: once the member has confirmed, answer instead of asking again`, async () => {
    const ctx = makeCtx();
    await bot.handleTurn(turn({ awaitingConfirm: true }), reply({ confidence: 0.77 }), ctx);
    assert.equal(traceTag(ctx), "reply");
  });

  test(`${name}: a long voice note is counted in words, at the threshold`, async () => {
    const ctx = makeCtx();
    await bot.handleTurn(turn({ isVoice: true, text: Array(40).fill("ok").join(" ") }), reply(), ctx);
    assert.equal(traceTag(ctx), "confirm");
  });

  test(`${name}: nothing to restate means a draft, not a blind send`, async () => {
    const ctx = makeCtx();
    await bot.handleTurn(turn(), reply({ confidence: 0.78, understanding: "  " }), ctx);
    assert.deepEqual(names(ctx), ["draft"]);
  });
}
