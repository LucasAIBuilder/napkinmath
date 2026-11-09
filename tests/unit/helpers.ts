import { evaluateLines } from "../../src/lib/engine";
import { formatResult } from "../../src/lib/formatter";

// Evaluate a sheet and return what the results column would show for each line.
export function results(lines: string[]) {
  return evaluateLines(lines).lineEvals.map((le) =>
    le.kind === "expr" ? formatResult(le.value, { currencyCode: le.currencyCode }) : null,
  );
}
