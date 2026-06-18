import type { SplitRule, SplitResult, UtilityReading } from '@/types';

export const computeSplit = (
  baseRent: number,
  utilities: { water: UtilityReading; electric: UtilityReading; commonArea: number },
  rule: SplitRule
): SplitResult => {
  const platformAmount = Number((baseRent * rule.platformCut).toFixed(2));
  const propertyFeeAmount = Number((baseRent * rule.propertyFee).toFixed(2));
  const landlordBase = Number((baseRent - platformAmount - propertyFeeAmount).toFixed(2));
  const utilitiesPassThrough = Number(
    (utilities.water.amount + utilities.electric.amount + utilities.commonArea).toFixed(2)
  );
  const landlordAmount = Number((landlordBase + utilitiesPassThrough).toFixed(2));

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    totalBase: baseRent,
    platformAmount,
    propertyFeeAmount,
    landlordAmount,
    utilitiesPassThrough,
  };
};

export const utilityDefaults = (): { water: UtilityReading; electric: UtilityReading; commonArea: number } => ({
  water: { type: 'water', previous: 0, current: 0, unitPrice: 5.5, usage: 0, amount: 0 },
  electric: { type: 'electric', previous: 0, current: 0, unitPrice: 0.85, usage: 0, amount: 0 },
  commonArea: 0,
});

export const computeUtility = (u: Partial<UtilityReading> & Pick<UtilityReading, 'type'>): UtilityReading => {
  const usage = Math.max(0, (u.current ?? 0) - (u.previous ?? 0));
  const amount = Number((usage * (u.unitPrice ?? 0)).toFixed(2));
  return {
    type: u.type,
    previous: u.previous ?? 0,
    current: u.current ?? 0,
    unitPrice: u.unitPrice ?? (u.type === 'water' ? 5.5 : 0.85),
    usage,
    amount,
  };
};
