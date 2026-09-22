export interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
}

/** Expands a `{ min, max, step }` range into chip options for `ChoiceField`. */
export function numberChoices(
  { min, max, step = 1 }: { min: number; max: number; step?: number },
  formatLabel: (value: number) => string = String,
): ChoiceOption<number>[] {
  const options: ChoiceOption<number>[] = [];
  for (let value = min; value <= max; value += step) {
    // Float steps drift (0.1 + 0.2), so each value is snapped back to the step grid.
    const snapped = Math.round(value / step) * step;
    options.push({ value: snapped, label: formatLabel(snapped) });
  }
  return options;
}
