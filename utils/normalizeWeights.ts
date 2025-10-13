// utils/normalizeWeights.ts
export function normalizeWeights(raw: Record<string, number>) {
  if (!raw || Object.keys(raw).length === 0) return {};

  // Filter invalid values
  const filtered = Object.fromEntries(
    Object.entries(raw).filter(([k, v]) => typeof v === "number" && !isNaN(v) && v > 0)
  );

  if (Object.keys(filtered).length === 0) return {};

  const total = Object.values(filtered).reduce((a, b) => a + b, 0);

  // If total is 0 → assign equal weights
  if (total === 0) {
    const equal = 100 / Object.keys(filtered).length;
    return Object.fromEntries(
      Object.keys(filtered).map((k) => [k, parseFloat(equal.toFixed(2))])
    );
  }

  // Normalize to 100%
  let normalized = Object.fromEntries(
    Object.entries(filtered).map(([k, v]) => [
      k,
      parseFloat(((v / total) * 100).toFixed(2)),
    ])
  );

  // Fix floating-point drift
  const sumNorm = Object.values(normalized).reduce((a, b) => a + b, 0);
  const diff = parseFloat((100 - sumNorm).toFixed(2));

  if (Math.abs(diff) > 0.0001) {
    const lastKey = Object.keys(normalized).pop();
    if (lastKey) {
      normalized[lastKey] = parseFloat(
        (normalized[lastKey] + diff).toFixed(2)
      );
    }
  }

  return normalized;
}
