// Recording ctx: every side effect a worker makes is captured as [method, ...args].
export function makeCtx() {
  const calls = [];
  const rec = (name) => (...args) => calls.push([name, ...args]);
  return {
    calls,
    send: rec("send"),
    draft: rec("draft"),
    page: rec("page"),
    notice: rec("notice"),
    setAwaitingConfirm: rec("setAwaitingConfirm"),
    trace: rec("trace"),
  };
}

export const names = (ctx) => ctx.calls.map((c) => c[0]).filter((n) => n !== "trace");
export const traceTag = (ctx) => ctx.calls.find((c) => c[0] === "trace")?.[1];

export function turn(overrides = {}) {
  return { memberId: "m1", text: "how do I share a project?", isVoice: false, draftOnly: false, awaitingConfirm: false, ...overrides };
}
