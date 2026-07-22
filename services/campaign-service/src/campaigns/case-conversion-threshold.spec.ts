import { getCaseConversionThreshold } from './case-conversion-threshold';

describe('getCaseConversionThreshold', () => {
  const original = process.env.CASE_CONVERSION_THRESHOLD;

  afterEach(() => {
    if (original === undefined) delete process.env.CASE_CONVERSION_THRESHOLD;
    else process.env.CASE_CONVERSION_THRESHOLD = original;
  });

  it('defaults to 0.40 when not configured', () => {
    delete process.env.CASE_CONVERSION_THRESHOLD;
    expect(getCaseConversionThreshold()).toBe(0.4);
  });

  it('reads the value from CASE_CONVERSION_THRESHOLD when set', () => {
    process.env.CASE_CONVERSION_THRESHOLD = '0.55';
    expect(getCaseConversionThreshold()).toBe(0.55);
  });

  it('falls back to the default on an invalid value', () => {
    process.env.CASE_CONVERSION_THRESHOLD = 'not-a-number';
    expect(getCaseConversionThreshold()).toBe(0.4);
  });
});
