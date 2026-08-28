/**
 * TNFFM Apps Script compatibility helpers.
 *
 * The canonical Code.gs uses ok(...) as the response helper while some
 * existing handlers call ok_(...). Keep this alias in a separate .gs file
 * so the canonical Code.gs does not need to be duplicated or rewritten.
 */
function ok_(x) {
  return ok(x);
}
