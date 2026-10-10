import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A stand-in IntersectionObserver that the test drives by hand. */
class FakeObserver {
  static all: FakeObserver[] = [];
  readonly observed = new Set<Element>();
  readonly callback: IntersectionObserverCallback;
  readonly options: IntersectionObserverInit;

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    FakeObserver.all.push(this);
  }

  observe(element: Element) {
    this.observed.add(element);
  }

  unobserve(element: Element) {
    this.observed.delete(element);
  }

  disconnect() {
    this.observed.clear();
  }

  report(target: Element, intersectionRatio: number) {
    const entry = {
      target,
      intersectionRatio,
      isIntersecting: intersectionRatio > 0,
    } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

const element = (name: string) => ({ name }) as unknown as Element;

// The module keeps its observers for the life of the page, so every test loads a fresh copy.
async function load() {
  vi.resetModules();
  return import('./useInView');
}

beforeEach(() => {
  FakeObserver.all = [];
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('watchInView', () => {
  it('shares one observer between every watch with the same options', async () => {
    const { watchInView } = await load();
    watchInView(element('a'), () => undefined);
    watchInView(element('b'), () => undefined);
    watchInView(element('c'), () => undefined, { threshold: 0.4 });

    expect(FakeObserver.all).toHaveLength(2);
    expect(FakeObserver.all[0].observed.size).toBe(2);
    expect(FakeObserver.all[0].options).toMatchObject({ threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  });

  it('reports only to the watches of the element that moved', async () => {
    const { watchInView } = await load();
    const a = element('a');
    const seenA = vi.fn();
    const seenB = vi.fn();
    watchInView(a, seenA);
    watchInView(element('b'), seenB);

    FakeObserver.all[0].report(a, 0.5);
    expect(seenA).toHaveBeenCalledTimes(1);
    expect(seenB).not.toHaveBeenCalled();
  });

  it('hands a late watch the last report, since the observer will not repeat it', async () => {
    const { watchInView } = await load();
    const a = element('a');
    watchInView(a, () => undefined);
    FakeObserver.all[0].report(a, 0.5);

    const late = vi.fn();
    watchInView(a, late);
    expect(late).toHaveBeenCalledTimes(1);
    expect(late.mock.calls[0][0].intersectionRatio).toBe(0.5);
  });

  it('unobserves an element once its last watch stops, even from inside a report', async () => {
    const { watchInView } = await load();
    const a = element('a');
    const first = vi.fn((_entry: IntersectionObserverEntry, stop: () => void) => stop());
    const second = vi.fn();
    watchInView(a, first);
    const stopSecond = watchInView(a, second);
    const observer = FakeObserver.all[0];

    observer.report(a, 1);
    observer.report(a, 1);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    expect(observer.observed.has(a)).toBe(true);

    stopSecond();
    stopSecond();
    expect(observer.observed.has(a)).toBe(false);
  });

  it('does nothing where IntersectionObserver is missing', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { supportsInView, watchInView } = await load();
    expect(supportsInView()).toBe(false);
    expect(() => watchInView(element('a'), () => undefined)()).not.toThrow();
  });
});

describe('isInView', () => {
  it('waits for the threshold share, not the first visible pixel', async () => {
    const { isInView } = await load();
    const entry = (intersectionRatio: number) =>
      ({ intersectionRatio, isIntersecting: intersectionRatio > 0 }) as IntersectionObserverEntry;

    expect(isInView(entry(0.1), 0.4)).toBe(false);
    expect(isInView(entry(0.4), 0.4)).toBe(true);
    expect(isInView(entry(0.01), 0)).toBe(true);
    expect(isInView(entry(0), 0)).toBe(false);
  });
});
