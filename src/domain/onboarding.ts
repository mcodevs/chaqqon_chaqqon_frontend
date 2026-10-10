import { type Feature, hasFeature } from './teacherBilling';

/**
 * The first things a new teacher does, in the order that gets their class going. A step whose section
 * the tariff does not open is left out, so the list never asks for something the teacher cannot do.
 */

export type OnboardingStepId = 'profile' | 'student' | 'payment' | 'homework' | 'market';

export interface OnboardingStep {
  id: OnboardingStepId;
  done: boolean;
}

export interface OnboardingFacts {
  /** Name and phone are both filled in. */
  profileComplete: boolean;
  students: number;
  /** Payments recorded for the class; until one is, a student's profile stays closed. */
  payments: number;
  /** A homework room was ever opened (running now, or with results). */
  homeworkGiven: boolean;
  marketItems: number;
  features: readonly Feature[];
}

export function onboardingSteps(facts: OnboardingFacts): OnboardingStep[] {
  const steps: OnboardingStep[] = [
    { id: 'profile', done: facts.profileComplete },
    { id: 'student', done: facts.students > 0 },
    { id: 'payment', done: facts.payments > 0 },
  ];
  if (hasFeature(facts.features, 'homework_rooms')) steps.push({ id: 'homework', done: facts.homeworkGiven });
  if (hasFeature(facts.features, 'market')) steps.push({ id: 'market', done: facts.marketItems > 0 });
  return steps;
}

/** How many steps are done, out of how many. */
export function onboardingProgress(steps: readonly OnboardingStep[]): { done: number; total: number } {
  return { done: steps.filter((step) => step.done).length, total: steps.length };
}
