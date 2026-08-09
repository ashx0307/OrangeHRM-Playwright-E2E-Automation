import { faker } from '@faker-js/faker';

/** A unique suffix keeps records collision-free on a shared, never-reset demo instance. */
function uniqueSuffix() {
  return faker.string.alphanumeric(6).toLowerCase();
}

/**
 * Employee Id is an ordinary, editable text input — the server only
 * pre-fills it with its own next sequential value (confirmed live: no
 * `readonly`/`disabled`/`maxlength` on the field, and that pre-filled value
 * is itself a zero-padded 4-digit string, e.g. "0552"). Overwriting it with
 * our own random 4-digit value sidesteps the collision entirely for anyone
 * else also relying on that same sequential default, rather than reacting to
 * the collision after the fact.
 */
export function randomEmployeeId(): string {
  return String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
}

export function randomEmployee() {
  const firstName = faker.person.firstName();
  const lastName = `${faker.person.lastName()}${uniqueSuffix()}`;
  return {
    firstName,
    middleName: faker.person.middleName(),
    lastName,
    // The app's "Employee Name" autocomplete (Add User, Assign Leave,
    // Entitlements, Leave List search) binds to "First Last" only — it never
    // includes the middle name, so `fullName` has to match that or
    // selectAutocompleteOption's post-selection value check never passes.
    // Employee List *table rows*, by contrast, render "First Middle Last" —
    // callers doing a table hasText lookup should search by `lastName` alone
    // instead (unique thanks to its random suffix, and a substring either way).
    fullName: `${firstName} ${lastName}`,
  };
}

/**
 * The app scores password strength with a pattern-aware meter (zxcvbn-style),
 * not a simple character-class checklist — a predictable suffix like "123"
 * gets flagged "Very Weak" and silently blocks submission even when the rest
 * of the string is randomized. Shuffling independently-random character
 * classes together avoids any recognizable sequence.
 */
function strongPassword(): string {
  const chars = [
    ...faker.string.alpha({ length: 4, casing: 'upper' }),
    ...faker.string.alpha({ length: 4, casing: 'lower' }),
    ...faker.string.numeric(4),
    ...faker.helpers.arrayElements(['!', '@', '#', '$', '%'], 2),
  ];
  return faker.helpers.shuffle(chars).join('');
}

export function randomSystemUser(employeeFullName: string) {
  const suffix = uniqueSuffix();
  return {
    username: `ess.${suffix}`,
    password: strongPassword(),
    employeeFullName,
  };
}

export function randomCandidate() {
  return {
    firstName: faker.person.firstName(),
    lastName: `${faker.person.lastName()}${uniqueSuffix()}`,
    email: `candidate.${uniqueSuffix()}@example.com`,
    contactNumber: faker.string.numeric(10),
  };
}

export function randomJobTitle() {
  return {
    title: `${faker.person.jobTitle()} ${uniqueSuffix()}`,
    description: faker.lorem.sentence(),
  };
}

export function randomVacancy() {
  return {
    name: `${faker.person.jobTitle()} ${uniqueSuffix()}`,
    description: faker.lorem.sentence(),
  };
}

export function randomAddress() {
  return {
    street1: faker.location.streetAddress(),
    city: faker.location.city(),
  };
}

export function randomEmergencyContact() {
  return {
    name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    relationship: faker.helpers.arrayElement(['Spouse', 'Parent', 'Sibling', 'Friend']),
    mobile: faker.string.numeric(10),
  };
}
