import { describe, expect, it } from 'vitest';
import { type OnboardingFacts, onboardingProgress, onboardingSteps } from './onboarding';
import { dailyPrice } from './teacherBilling';

const fresh: OnboardingFacts = {
  profileComplete: false,
  students: 0,
  payments: 0,
  homeworkGiven: false,
  marketItems: 0,
  features: ['homework_rooms', 'market'],
};

describe("a new teacher's first steps", () => {
  it('starts with the profile, the first student and their payment', () => {
    expect(onboardingSteps(fresh).map((step) => step.id)).toEqual([
      'profile',
      'student',
      'payment',
      'homework',
      'market',
    ]);
    expect(onboardingProgress(onboardingSteps(fresh))).toEqual({ done: 0, total: 5 });
  });

  it('leaves out what the tariff does not open', () => {
    expect(onboardingSteps({ ...fresh, features: [] }).map((step) => step.id)).toEqual([
      'profile',
      'student',
      'payment',
    ]);
  });

  it('ticks off each step from what the teacher has already done', () => {
    const steps = onboardingSteps({
      ...fresh,
      profileComplete: true,
      students: 3,
      payments: 1,
      homeworkGiven: true,
    });
    expect(steps.filter((step) => !step.done).map((step) => step.id)).toEqual(['market']);
    expect(onboardingProgress(steps)).toEqual({ done: 4, total: 5 });
  });
});

describe('the daily price', () => {
  it("rounds a month's price per day up to the next 100 so'm", () => {
    expect(dailyPrice(150_000)).toBe(5_000);
    expect(dailyPrice(100_000)).toBe(3_400);
    expect(dailyPrice(0)).toBe(0);
  });
});
