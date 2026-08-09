const DISCOUNT_TIERS = [
    { minimumParticipants: 50, discount: 0.60 },
    { minimumParticipants: 25, discount: 0.40 },
    { minimumParticipants: 10, discount: 0.25 },
    { minimumParticipants: 5, discount: 0.15 },
];

export function normalizeParticipantCount(value) {
    const count = Number.parseInt(value, 10);
    return Number.isInteger(count) && count > 0 ? count : 0;
}

export function getGroupDiscount(participantCount) {
    const count = normalizeParticipantCount(participantCount);
    return DISCOUNT_TIERS.find((tier) => count >= tier.minimumParticipants)?.discount ?? 0;
}

export function ceilCredits(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error('Invalid credit amount.');
    }

    return Math.ceil((amount - Number.EPSILON) * 100) / 100;
}

export function getGroupPerParticipantPrice(basePrice, participantCount) {
    const count = normalizeParticipantCount(participantCount);
    if (count === 0) throw new Error('At least one participant is required.');

    const base = Number(basePrice);
    if (!Number.isFinite(base) || base < 0) throw new Error('Invalid base price.');

    return ceilCredits(base * (1 - getGroupDiscount(count)));
}

export function getGroupTotalPrice(basePrice, participantCount) {
    const count = normalizeParticipantCount(participantCount);
    const perParticipant = getGroupPerParticipantPrice(basePrice, count);
    return Number((perParticipant * count).toFixed(2));
}
