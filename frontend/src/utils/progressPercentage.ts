export function calculateProgressPercentage(
  count: number,
  total: number,
  ceilingThresholdFrom: number,
  ceilingThresholdTo: number,
) {
  // Calculates the progress percentage for count / total, rounding up for percentages within the threshold, rounding down for all other cases.
  // This allows us to determine when to round up a percentage between 0 and 1 (e.g. 0.5%) to 1. And it makes sure we don't round a percantage of 99.5% or higher up to 100%.
  if (total === 0) {
    return 0;
  }
  const percentage = (count / total) * 100;
  const shouldRoundUp = percentage >= ceilingThresholdFrom && percentage < ceilingThresholdTo;
  return shouldRoundUp ? Math.ceil(percentage) : Math.floor(percentage);
}
