// advisor-bot: one member turn in, side effects out through ctx. Routing policy lives in shared/rails.js.
import { readFileSync } from "node:fs";
import { handleWithPolicy } from "../../../shared/rails.js";

const config = JSON.parse(readFileSync(new URL("../config.json", import.meta.url), "utf8"));

export async function handleTurn(event, result, ctx) {
  handleWithPolicy(config, event, result, ctx);
}
