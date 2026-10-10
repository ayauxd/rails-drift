// Cohort support bot: one member turn in, side effects out through ctx.
import { route } from "./route.js";
import { confirmText } from "../../../shared/rails.js";

export async function handleTurn(event, result, ctx) {
  const { tag, why } = route(result, event);
  ctx.trace(tag, why);
  switch (tag) {
    case "escalate":
      ctx.page(why);
      break;
    case "draft_hold":
    case "low_conf":
      ctx.draft(result ? result.reply : "", { why });
      break;
    case "confirm":
      ctx.send(event.memberId, confirmText(result.understanding));
      ctx.setAwaitingConfirm(event.memberId, true);
      break;
    case "reply":
      ctx.send(event.memberId, result.reply);
      ctx.setAwaitingConfirm(event.memberId, false);
      break;
  }
}
