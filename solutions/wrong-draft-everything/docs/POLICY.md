# Routing policy for the Slack agents

This is the house policy for what an agent does with one model ("brain") result. Both agents in this repo, `support-bot` and `advisor-bot`, must follow it. Where the code and this document disagree, this document wins.

## Inputs

For each member turn the agent has:

- `result`: the brain's structured output, or `null` when the brain call threw or returned nothing. Shape: `{ action, reply, confidence, understanding, reason }`.
  - `action` is `"reply"` or `"escalate"`.
  - `confidence` should be a number from 0 to 1. Anything else (missing, `null`, a string, `NaN`, below 0, above 1) counts as **missing**.
  - `reply` is the answer text the brain drafted (used by every outcome that sends or drafts a reply).
  - `understanding` is a one-line restatement of what the member is asking. It may be empty; whitespace-only counts as empty.
  - `reason` is free text. Transport failures are stamped by the brain with a reason that starts with or contains one of the **infra sentinels** listed in `shared/policy.json`. Matching is case-insensitive.
- `event.memberId`: who sent the turn.
- `event.draftOnly`: the member is on an explicit manual hold.
- `event.awaitingConfirm`: on the previous turn the agent asked this member to confirm its restatement, and this turn is their answer.
- `event.isVoice` and `event.text`: a voice transcript counts as **long** when it has at least `voiceConfirmWords` words (split on whitespace).

## Thresholds

Defaults live in `shared/policy.json`: `floor`, `midHi`, `voiceConfirmWords`, `infraSentinels`. An agent may override `floor`, `midHi` or `voiceConfirmWords` in its own `config.json`; a value it does not override comes from `shared/policy.json`. Thresholds must not be hard-coded anywhere else: changing `shared/policy.json` or an agent's `config.json` must change behavior with no code edit.

## Decision order

Apply the first rule that matches.

1. **infra**: `result` is `null`, or `action` is `"escalate"` and `reason` matches an infra sentinel. The model or API failed; this is not a question the agent could not answer. Tell the member there is a temporary problem and record an infra notice for the operator. Never page the operator.
2. **escalate**: `action` is `"escalate"`. Page the operator. This applies to members on manual hold too.
3. **draft_hold**: the member is on manual hold. Send the reply to the operator as a draft. Never send it to the member.
4. Work out the effective confidence: the given confidence if valid, otherwise `floor` (a successful reply with no usable confidence goes to the confirm-first path, never straight to the member).
5. **low_conf**: effective confidence is below `floor`. Park the reply as a draft for the operator.
6. **confirm**: the member is not answering a confirmation (`awaitingConfirm` is false), and either the effective confidence is below `midHi` or the turn is a long voice transcript. Restate `understanding` to the member and ask them to confirm; mark the member as awaiting confirmation. If `understanding` is empty there is nothing to restate: treat the turn as **low_conf** instead.
7. **reply**: send the reply to the member and clear any awaiting-confirmation mark.

## What each outcome does through `ctx`

| Outcome | Required calls |
|---|---|
| infra | `ctx.notice("infra", why)` and `ctx.send(memberId, TEMP_ISSUE_TEXT)` |
| escalate | `ctx.page(why)` |
| draft_hold | `ctx.draft(result.reply, { why })` |
| low_conf | `ctx.draft(result.reply, { why })` |
| confirm | `ctx.send(memberId, confirmText(result.understanding))` and `ctx.setAwaitingConfirm(memberId, true)` |
| reply | `ctx.send(memberId, result.reply)` and `ctx.setAwaitingConfirm(memberId, false)` |

`TEMP_ISSUE_TEXT` and `confirmText` are exported from `shared/rails.js`. Every outcome also calls `ctx.trace(tag, why)` exactly once, where `tag` is the outcome name above. No other `ctx` calls are made.
