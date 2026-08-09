export interface SystemUserRoleCase {
  description: string;
  role: 'Admin' | 'ESS';
  status: 'Enabled' | 'Disabled';
}

/** Drives the Admin > User Management CRUD workflow across both platform roles. */
export const systemUserRoleCases: SystemUserRoleCase[] = [
  { description: 'Admin role user, enabled', role: 'Admin', status: 'Enabled' },
  { description: 'ESS role user, enabled', role: 'ESS', status: 'Enabled' },
];
