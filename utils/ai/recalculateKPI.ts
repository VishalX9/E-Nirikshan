import dbConnect from '@/utils/db';
import Project from '@/models/Project';
import Kpi from '@/models/KPI';
import User from '@/models/User';
import { normalizeWeights } from '@/utils/normalizeWeights';

interface KPIWeights {
  [kpiName: string]: {
    fieldWeight: number;
    hqWeight: number;
  };
}

export async function recalculateKPIForEmployee(
  employeeId: string,
  projectId: string
): Promise<void> {
  try {
    await dbConnect();

    const project = await Project.findById(projectId);
    if (!project || !project.kpiWeights) {
      console.log(`No KPI weights found for project ${projectId}, skipping recalculation.`);
      return;
    }

    const user = await User.findById(employeeId);
    if (!user) {
      console.log(`User ${employeeId} not found.`);
      return;
    }

    const employeeType = user.employerType || 'Field'; // Default to 'Field'
    let kpiWeights = project.kpiWeights as KPIWeights;

    // Normalize weights to ensure they sum to 100%
    kpiWeights = normalizeProjectWeights(kpiWeights, employeeType);

    // Mark user as having AI-generated KPIs
    if (!user.hasAIKPI) {
      user.hasAIKPI = true;
      await user.save();
    }

    const employeeKPIs = await Kpi.find({ assignedTo: employeeId });
    const createdKPIs: string[] = [];
    const updatedKPIs: string[] = [];

    // Deduplicate existing KPIs before processing
    const uniqueExistingKPIs: { [key: string]: typeof employeeKPIs[0] } = {};
    for (const kpi of employeeKPIs) {
      if (!uniqueExistingKPIs[kpi.kpiName]) {
        uniqueExistingKPIs[kpi.kpiName] = kpi;
      } else {
        // Delete duplicate
        await Kpi.findByIdAndDelete(kpi._id);
        console.log(`🗑️ Removed duplicate KPI: ${kpi.kpiName} for employee ${employeeId}`);
      }
    }

    for (const [kpiName, weights] of Object.entries(kpiWeights)) {
      const weightToUse = employeeType === 'Field' ? weights.fieldWeight : weights.hqWeight;

      // Skip KPIs with zero or very low weight
      if (weightToUse === 0 || weightToUse < 5) continue;

      let kpi = uniqueExistingKPIs[kpiName];

      if (!kpi) {
        // Create new project-specific KPI
        await Kpi.create({
          kpiName,
          metric: kpiName,
          title: kpiName,
          target: 100,
          achievedValue: 0,
          weightage: parseFloat(weightToUse.toFixed(2)),
          assignedTo: employeeId,
          period: new Date().getFullYear().toString(),
          employerType: employeeType,
          status: 'in_progress',
          source: 'e-office',
          isProjectSpecific: true,
          projectId: projectId,
          projectName: project.name
        });
        createdKPIs.push(kpiName);
      } else {
        // Update weightage and mark as project-specific
        kpi.originalWeightage = kpi.weightage;
        kpi.weightage = parseFloat(weightToUse.toFixed(2));
        kpi.isProjectSpecific = true;
        kpi.projectId = projectId;
        kpi.projectName = project.name;
        await kpi.save();
        updatedKPIs.push(kpiName);
      }
    }

    console.log(`✅ KPI recalculation complete for ${employeeId}:`, {
      created: createdKPIs.length,
      updated: updatedKPIs.length
    });

    console.log(`KPIs recalculated for employee ${employeeId} based on project ${projectId}. Created: ${createdKPIs.length}`);
  } catch (error) {
    console.error('Error recalculating KPI:', error);
  }
}

/**
 * Normalizes project KPI weights to ensure they sum to exactly 100%
 */
function normalizeProjectWeights(weights: KPIWeights, employeeType: 'Field' | 'HQ'): KPIWeights {
  const fieldWeightsMap: Record<string, number> = {};
  const hqWeightsMap: Record<string, number> = {};

  for (const [kpiName, weight] of Object.entries(weights)) {
    fieldWeightsMap[kpiName] = weight.fieldWeight;
    hqWeightsMap[kpiName] = weight.hqWeight;
  }

  const normalizedField = normalizeWeights(fieldWeightsMap);
  const normalizedHQ = normalizeWeights(hqWeightsMap);

  const normalized: KPIWeights = {};
  for (const kpiName of Object.keys(weights)) {
    normalized[kpiName] = {
      fieldWeight: normalizedField[kpiName] || 0,
      hqWeight: normalizedHQ[kpiName] || 0,
    };
  }

  const totalCheck = employeeType === 'Field'
    ? Object.values(normalizedField).reduce((a, b) => a + b, 0)
    : Object.values(normalizedHQ).reduce((a, b) => a + b, 0);

  console.log(`✅ Project weights normalized for ${employeeType}:`, {
    total: totalCheck,
    kpiCount: Object.keys(normalized).length
  });

  return normalized;
}

/**
 * Updates specific KPIs based on the submission of a Daily Progress Report (DPR).
 * @param employeeId The ID of the employee submitting the DPR.
 * @param projectId The ID of the associated project.
 * @param dprData The content of the DPR.
 */
export async function updateKPIFromDPR(
  employeeId: string,
  projectId: string,
  dprData: {
    progress?: string;
    challenges?: string;
    nextSteps?: string;
  }
): Promise<void> {
  try {
    // It's good practice to ensure weights are correct before updating achievements.
    await recalculateKPIForEmployee(employeeId, projectId);
    
    const timelinessKPI = await Kpi.findOne({
      assignedTo: employeeId,
      kpiName: 'Timeliness of DPR Submission'
    });

    if (timelinessKPI) {
      const currentAchieved = timelinessKPI.achievedValue || 0;
      timelinessKPI.achievedValue = Math.min(currentAchieved + 10, timelinessKPI.target);
      await timelinessKPI.save();
    }

    const qualityKPI = await Kpi.findOne({
      assignedTo: employeeId,
      kpiName: 'Quality of DPR Documentation'
    });

    if (qualityKPI && dprData.progress) {
      // Simple metric: longer progress description suggests higher quality
      const contentQuality = dprData.progress.length > 50 ? 10 : 5;
      const currentAchieved = qualityKPI.achievedValue || 0;
      qualityKPI.achievedValue = Math.min(currentAchieved + contentQuality, qualityKPI.target);
      await qualityKPI.save();
    }

  } catch (error) {
    console.error('Error updating KPI from DPR:', error);
  }
}
