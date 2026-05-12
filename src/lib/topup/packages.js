export const TOPUP_PACKAGES = [
    { amountUsd: 1.5, credits: 120, label: '$1.50', desc: '~13 note generations', hint: '~13 notes', badge: null },
    { amountUsd: 5, credits: 500, label: '$5', desc: '~55 note generations', hint: '~55 notes', badge: null },
    { amountUsd: 10, credits: 1100, label: '$10', desc: '~122 note generations', hint: '~122 notes', badge: { text: '+100 bonus', style: 'bonus' } },
    { amountUsd: 25, credits: 3000, label: '$25', desc: '~333 note generations', hint: '~333 notes', badge: { text: '+500 bonus', style: 'best' } },
];

const PACKAGE_AMOUNT_TOLERANCE = 0.001;

export function getTopupCredits(usdAmount) {
    const matchedPackage = TOPUP_PACKAGES.find(({ amountUsd }) => Math.abs(amountUsd - usdAmount) < PACKAGE_AMOUNT_TOLERANCE);
    return matchedPackage ? matchedPackage.credits : Math.round(usdAmount * 100);
}
