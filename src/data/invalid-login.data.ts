export interface InvalidLoginCase {
  description: string;
  username: string;
  password: string;
  expected: 'invalid-credentials' | 'required-username' | 'required-password' | 'required-both';
}

export const invalidLoginCases: InvalidLoginCase[] = [
  {
    description: 'wrong username, wrong password',
    username: 'not_a_real_user',
    password: 'wrongPass123',
    expected: 'invalid-credentials',
  },
  {
    description: 'valid username, wrong password',
    username: 'Admin',
    password: 'wrongPass123',
    expected: 'invalid-credentials',
  },
  {
    description: 'empty username',
    username: '',
    password: 'admin123',
    expected: 'required-username',
  },
  {
    description: 'empty password',
    username: 'Admin',
    password: '',
    expected: 'required-password',
  },
  {
    description: 'both fields empty',
    username: '',
    password: '',
    expected: 'required-both',
  },
];
