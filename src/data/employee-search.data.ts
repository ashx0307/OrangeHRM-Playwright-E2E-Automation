export interface EmploymentStatusFilterCase {
  description: string;
  includeOption: 'Current Employees Only' | 'Past Employees Only' | 'Current and Past Employees';
}

/** Drives the PIM employee list "Include" filter across its three scopes. */
export const employmentStatusFilterCases: EmploymentStatusFilterCase[] = [
  { description: 'current employees only', includeOption: 'Current Employees Only' },
  { description: 'past employees only', includeOption: 'Past Employees Only' },
  { description: 'current and past employees', includeOption: 'Current and Past Employees' },
];
