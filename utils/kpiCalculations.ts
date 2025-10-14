/**
 * KPI Calculation and Normalization Utilities
 * Ensures accurate weight normalization and prevents duplicates
 */

export interface KPIWeight {
  name: string;
  weight: number;
}

export interface KPIWeights {
  [kpiName: string]: {
    fieldWeight: number;
    hqWeight: number;
  };
}

/**
 * Normalizes weights to exactly 100%
 * Step 1: Calculate proportional weights
 * Step 2: Round to 2 decimals
 * Step 3: Correct rounding errors by adjusting largest weight
 */
export function normalizeWeights(weights: { [key: string]: number }): { [key: string]: number } {
  const normalized: { [key: string]: number } = {};
  const keys = Object.keys(weights);

  if (keys.length === 0) return {};

  // Calculate total
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    // Equal distribution if all weights are 0
    const equalWeight = parseFloat((100 / keys.length).toFixed(2));
    keys.forEach(key => normalized[key] = equalWeight);
    return normalized;
  }

  // Step 1: Proportional normalization
  for (const key of keys) {
    normalized[key] = parseFloat(((weights[key] / totalWeight) * 100).toFixed(2));
  }

  // Step 2: Calculate correction needed
  const currentTotal = Object.values(normalized).reduce((sum, w) => sum + w, 0);
  const correction = parseFloat((100 - currentTotal).toFixed(2));

  // Step 3: Apply correction to largest weight
  if (Math.abs(correction) > 0.01) {
    const largestKey = keys.reduce((a, b) => normalized[a] > normalized[b] ? a : b);
    normalized[largestKey] = parseFloat((normalized[largestKey] + correction).toFixed(2));
  }

  console.log('✅ Weight normalization complete:', {
    original: weights,
    normalized,
    total: Object.values(normalized).reduce((sum, w) => sum + w, 0)
  });

  return normalized;
}

/**
 * Normalizes project KPI weights (field and HQ separately)
 */
export function normalizeProjectWeights(
  weights: KPIWeights,
  employeeType: 'Field' | 'HQ'
): KPIWeights {
  const normalized: KPIWeights = {};
  const keys = Object.keys(weights);

  if (keys.length === 0) return weights;

  // Extract weights for the specific employee type
  const currentWeights: { [key: string]: number } = {};
  for (const key of keys) {
    currentWeights[key] = employeeType === 'Field'
      ? weights[key].fieldWeight
      : weights[key].hqWeight;
  }

  // Normalize
  const normalizedWeights = normalizeWeights(currentWeights);

  // Reconstruct the KPIWeights structure
  for (const key of keys) {
    normalized[key] = {
      fieldWeight: employeeType === 'Field'
        ? normalizedWeights[key]
        : weights[key].fieldWeight,
      hqWeight: employeeType === 'HQ'
        ? normalizedWeights[key]
        : weights[key].hqWeight
    };
  }

  return normalized;
}

/**
 * Removes duplicate KPI entries by name
 * Keeps the entry with the highest weight
 */
export function deduplicateKPIs<T extends { kpiName?: string; name?: string; weight?: number; weightage?: number }>(
  kpiList: T[]
): T[] {
  const uniqueMap = new Map<string, T>();

  for (const kpi of kpiList) {
    const name = kpi.kpiName || kpi.name || '';
    const weight = kpi.weight || kpi.weightage || 0;

    if (!name) continue;

    const existing = uniqueMap.get(name);
    if (!existing) {
      uniqueMap.set(name, kpi);
    } else {
      // Keep the one with higher weight
      const existingWeight = existing.weight || existing.weightage || 0;
      if (weight > existingWeight) {
        uniqueMap.set(name, kpi);
      }
    }
  }

  const deduplicated = Array.from(uniqueMap.values());

  if (deduplicated.length < kpiList.length) {
    console.log('✅ Removed duplicate KPIs:', {
      original: kpiList.length,
      deduplicated: deduplicated.length,
      removed: kpiList.length - deduplicated.length
    });
  }

  return deduplicated;
}

/**
 * Validates that total weight equals 100%
 * Returns validation result with error message if failed
 */
export function validateWeightTotal(
  weights: { [key: string]: number },
  tolerance: number = 0.5
): { valid: boolean; total: number; error?: string } {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const valid = Math.abs(total - 100) <= tolerance;

  return {
    valid,
    total: parseFloat(total.toFixed(2)),
    error: valid ? undefined : `Weight total is ${total.toFixed(2)}%, expected 100%`
  };
}

/**
 * Ensures no weight is 0% or >100%
 */
export function validateWeightRange(
  weights: { [key: string]: number },
  minWeight: number = 5,
  maxWeight: number = 100
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const [key, weight] of Object.entries(weights)) {
    if (weight < minWeight && weight > 0) {
      violations.push(`${key}: ${weight}% (below minimum ${minWeight}%)`);
    }
    if (weight > maxWeight) {
      violations.push(`${key}: ${weight}% (above maximum ${maxWeight}%)`);
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Calculate final KPI score from individual scores and weights
 */
export function calculateFinalScore(
  kpiScores: { [kpiName: string]: number },
  weights: { [kpiName: string]: number }
): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [name, score] of Object.entries(kpiScores)) {
    const weight = weights[name] || 0;
    totalScore += (score * weight) / 100;
    totalWeight += weight;
  }

  // Normalize to 100 scale if weights don't sum to 100
  return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
}
