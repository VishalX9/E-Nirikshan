import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/utils/db';
import Project from '@/models/Project';
import Kpi from '@/models/KPI';
import User from '@/models/User';
import { normalizeWeights } from '@/utils/normalizeWeights';

// SECTION: Data Interfaces

export interface ProjectData {
  name: string;
  description: string;
  department?: string;
  tags?: string[];
  complexity?: 'Low' | 'Medium' | 'High';
  duration?: number; // in months
  budget?: number;
  fieldInvolvement?: number; // Percentage
  hqInvolvement?: number; // Percentage
  expectedDeliverables?: string;
}

export interface KPIWeights {
  [kpiName: string]: {
    fieldWeight: number;
    hqWeight: number;
  };
}

// SECTION: AI-Powered KPI Analysis with Validation

/**
 * Normalizes the KPI weights received from the AI to ensure they sum up to exactly 100.
 * This function programmatically enforces the summation rule, correcting any deviations
 * from the AI's output.
 * @param weights The raw KPIWeights object from the Gemini API.
 * @returns A validated and normalized KPIWeights object.
 */
function normalizeKPIWeights(weights: KPIWeights): KPIWeights {
  const kpiNames = Object.keys(weights);

  // Deduplicate: keep higher weight if duplicate names
  const uniqueKPIs: Record<string, { fieldWeight: number; hqWeight: number }> = {};
  for (const kpiName of kpiNames) {
    if (!uniqueKPIs[kpiName]) {
      uniqueKPIs[kpiName] = weights[kpiName];
    } else {
      uniqueKPIs[kpiName].fieldWeight = Math.max(uniqueKPIs[kpiName].fieldWeight, weights[kpiName].fieldWeight);
      uniqueKPIs[kpiName].hqWeight = Math.max(uniqueKPIs[kpiName].hqWeight, weights[kpiName].hqWeight);
    }
  }

  const fieldWeightsMap: Record<string, number> = {};
  const hqWeightsMap: Record<string, number> = {};

  for (const [kpiName, weight] of Object.entries(uniqueKPIs)) {
    fieldWeightsMap[kpiName] = weight.fieldWeight;
    hqWeightsMap[kpiName] = weight.hqWeight;
  }

  const normalizedField = normalizeWeights(fieldWeightsMap);
  const normalizedHQ = normalizeWeights(hqWeightsMap);

  const normalized: KPIWeights = {};
  for (const kpiName of Object.keys(uniqueKPIs)) {
    normalized[kpiName] = {
      fieldWeight: normalizedField[kpiName] || 0,
      hqWeight: normalizedHQ[kpiName] || 0,
    };
  }

  console.log('✅ AI KPI weights normalized:', {
    fieldTotal: Object.values(normalizedField).reduce((a, b) => a + b, 0),
    hqTotal: Object.values(normalizedHQ).reduce((a, b) => a + b, 0),
    kpiCount: Object.keys(normalized).length
  });

  return normalized;
}


/**
 * Analyzes project data using the Gemini API to generate KPI weights,
 * then validates and normalizes the output.
 * @param projectData The project data to be analyzed.
 * @returns A promise that resolves to a validated KPIWeights object.
 */
export async function analyzeKPIWithGemini(projectData: ProjectData): Promise<KPIWeights> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found, using default KPI weights');
      return getDefaultKPIWeights();
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // IMPROVED PROMPT: Uses stronger, more explicit language to guide the AI.
    const prompt = `
    You are a meticulous performance analysis AI for a government employee management system.
    Your task is to analyze the provided project data and return a JSON object that assigns KPI weights for Field Engineers and HQ Officers.

    **CRITICAL RULES:**
    1. The output MUST be ONLY a single, valid JSON object. Do not include markdown, code blocks, or any text before or after the JSON.
    2. For the "fieldWeight" values, the sum of all weights MUST be **exactly 100**.
    3. For the "hqWeight" values, the sum of all weights MUST be **exactly 100**.
    4. This is a hard constraint. Before returning the result, double-check your math to ensure both sums are 100.
    5. Assign higher weights to KPIs that are most relevant to the project's description, complexity, and expected deliverables.
    6. Field Engineers focus on on-ground work, surveys, DPR quality, and timelines.
    7. HQ Officers focus on file processing, responsiveness, digital adoption, and drafting quality.

    Available KPIs:
    - Timeliness of DPR Submission
    - Survey Accuracy and Completeness  
    - Quality of DPR Documentation
    - Adherence to Project Timelines
    - Expenditure Target Achievement
    - Technical Compliance
    - Site Coordination
    - Safety Standards Compliance
    - File Disposal Rate
    - Responsiveness to Requests
    - Digital Adoption Score
    - Quality of Drafting
    - Turnaround Time for Approvals
    - Policy Compliance
    - Interdepartmental Coordination

    PROJECT DATA:
    ${JSON.stringify(projectData, null, 2)}

    Return ONLY the valid JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean potential markdown formatting from the AI's response string.
    let cleanedText = text.trim().replace(/^```json\s*|```\s*$/g, '');
    
    const kpiWeightsFromAI = JSON.parse(cleanedText);

    // VALIDATION STEP: Pass the AI's output through the normalization function.
    const normalizedWeights = normalizeKPIWeights(kpiWeightsFromAI);

    console.log("Successfully received and normalized KPI weights from Gemini.");
    return normalizedWeights;

  } catch (error) {
    console.error('Error analyzing KPI with Gemini:', error);
    // Fallback to default weights on any error (parsing, API call, etc.)
    return getDefaultKPIWeights();
  }
}

// SECTION: Database and Business Logic (Unchanged but benefits from corrected data)

/**
 * Provides a default set of KPI weights as a fallback mechanism.
 * @returns A default KPIWeights object with normalized weights.
 */
function getDefaultKPIWeights(): KPIWeights {
  const raw = {
    "Timeliness of DPR Submission": { fieldWeight: 15, hqWeight: 5 },
    "Survey Accuracy and Completeness": { fieldWeight: 20, hqWeight: 5 },
    "Quality of DPR Documentation": { fieldWeight: 15, hqWeight: 10 },
    "Adherence to Project Timelines": { fieldWeight: 15, hqWeight: 10 },
    "Expenditure Target Achievement": { fieldWeight: 10, hqWeight: 10 },
    "Technical Compliance": { fieldWeight: 10, hqWeight: 5 },
    "Site Coordination": { fieldWeight: 5, hqWeight: 5 },
    "Safety Standards Compliance": { fieldWeight: 5, hqWeight: 0 },
    "File Disposal Rate": { fieldWeight: 0, hqWeight: 15 },
    "Responsiveness to Requests": { fieldWeight: 0, hqWeight: 15 },
    "Digital Adoption Score": { fieldWeight: 0, hqWeight: 5 },
    "Quality of Drafting": { fieldWeight: 0, hqWeight: 5 },
    "Turnaround Time for Approvals": { fieldWeight: 0, hqWeight: 5 },
    "Policy Compliance": { fieldWeight: 0, hqWeight: 5 },
    "Interdepartmental Coordination": { fieldWeight: 0, hqWeight: 5 }
  };

  // Apply final-pass normalization to defaults
  const fieldWeightsMap: Record<string, number> = {};
  const hqWeightsMap: Record<string, number> = {};

  for (const [kpiName, weight] of Object.entries(raw)) {
    fieldWeightsMap[kpiName] = weight.fieldWeight;
    hqWeightsMap[kpiName] = weight.hqWeight;
  }

  const normalizedField = normalizeWeights(fieldWeightsMap);
  const normalizedHQ = normalizeWeights(hqWeightsMap);

  const normalized: KPIWeights = {};
  for (const kpiName of Object.keys(raw)) {
    normalized[kpiName] = {
      fieldWeight: normalizedField[kpiName] || 0,
      hqWeight: normalizedHQ[kpiName] || 0,
    };
  }

  console.log('✅ Default KPI weights normalized:', {
    fieldTotal: Object.values(normalizedField).reduce((a, b) => a + b, 0),
    hqTotal: Object.values(normalizedHQ).reduce((a, b) => a + b, 0)
  });

  return normalized;
}
