export const FIELD_EMPLOYEE_KPIS = [
  {
    kpiName: 'Timeliness of DPR Submission',
    metric: 'Days',
    weightage: 12.5,
    description: 'Timely submission of Daily Progress Reports'
  },
  {
    kpiName: 'Quality of DPR Documentation',
    metric: 'Score',
    weightage: 12.5,
    description: 'Quality and completeness of DPR content'
  },
  {
    kpiName: 'Survey Accuracy and Completeness',
    metric: 'Percentage',
    weightage: 12.5,
    description: 'Accuracy of survey data and measurements'
  },
  {
    kpiName: 'Adherence to Project Timelines',
    metric: 'Days',
    weightage: 12.5,
    description: 'Meeting project deadlines and milestones'
  },
  {
    kpiName: 'Expenditure Targets',
    metric: 'Percentage',
    weightage: 12.5,
    description: 'Achievement of budget expenditure targets'
  },
  {
    kpiName: 'Financial Targets',
    metric: 'Percentage',
    weightage: 12.5,
    description: 'Meeting financial goals and targets'
  },
  {
    kpiName: 'Physical Progress of Works',
    metric: 'Percentage',
    weightage: 12.5,
    description: 'Physical completion of project works'
  },
  {
    kpiName: 'Compliance with Technical Standards',
    metric: 'Score',
    weightage: 12.5,
    description: 'Adherence to technical specifications and standards'
  }
];

export const HQ_EMPLOYEE_KPIS = [
  {
    kpiName: 'File Disposal Rate',
    metric: 'Percentage',
    weightage: 20,
    description: 'Rate of file closure and disposal'
  },
  {
    kpiName: 'Turnaround Time',
    metric: 'Days',
    weightage: 20,
    description: 'Average time taken to process files'
  },
  {
    kpiName: 'Quality of Drafting',
    metric: 'Score',
    weightage: 20,
    description: 'Quality and accuracy of document drafting'
  },
  {
    kpiName: 'Responsiveness',
    metric: 'Score',
    weightage: 20,
    description: 'Responsiveness to queries and requests'
  },
  {
    kpiName: 'Digital Adoption',
    metric: 'Percentage',
    weightage: 20,
    description: 'Usage and adoption of digital tools'
  }
];

export const getDefaultKPIs = (employerType: 'Field' | 'HQ') => {
  return employerType === 'Field' ? FIELD_EMPLOYEE_KPIS : HQ_EMPLOYEE_KPIS;
};
