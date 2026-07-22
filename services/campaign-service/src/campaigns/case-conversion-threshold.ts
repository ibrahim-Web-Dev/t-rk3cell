const DEFAULT_CASE_CONVERSION_THRESHOLD = 0.4;

/**
 * Below this expected conversion probability, a targeted campaign becomes an
 * optimization case (case doc 4.2: "Düşük dönüşümlü kampanyalar bir
 * optimizasyon vakasına dönüşür"). Configurable via `CASE_CONVERSION_THRESHOLD`
 * instead of hardcoded - see README "Vaka Açma Eşiği" for why 0.40 was chosen
 * as the default and why it is deliberately a *different* number from the
 * 0.60 subscriber-visibility threshold used by AI Service's recommendation
 * engine (that one decides what a subscriber sees; this one decides whether
 * an expert needs to look at the campaign at all).
 */
export function getCaseConversionThreshold(): number {
  const raw = process.env.CASE_CONVERSION_THRESHOLD;
  const parsed = raw ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_CASE_CONVERSION_THRESHOLD;
}
