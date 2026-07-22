import { canTransition } from './case-state-machine';

describe('case state machine', () => {
  it.each([
    ['YENI', 'ATANDI'],
    ['ATANDI', 'OPTIMIZE_EDILIYOR'],
    ['OPTIMIZE_EDILIYOR', 'TEST_EDILIYOR'],
    ['TEST_EDILIYOR', 'OPTIMIZE_EDILIYOR'],
    ['OPTIMIZE_EDILIYOR', 'TAMAMLANDI'],
    ['TAMAMLANDI', 'YAYINDA'],
    ['YAYINDA', 'ARSIVLENDI'],
  ] as const)('izin verir: %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ['YENI', 'TAMAMLANDI'],
    ['YENI', 'OPTIMIZE_EDILIYOR'],
    ['ATANDI', 'TEST_EDILIYOR'],
    ['TAMAMLANDI', 'ARSIVLENDI'],
    ['ARSIVLENDI', 'YENI'],
    ['YAYINDA', 'TAMAMLANDI'],
  ] as const)('reddeder: %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});
