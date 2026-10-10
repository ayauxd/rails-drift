// "Safe" routing: never send anything automatically; every turn goes to the operator as a draft.
export function route(result, event) {
  return { tag: "low_conf", why: "operator reviews everything" };
}
