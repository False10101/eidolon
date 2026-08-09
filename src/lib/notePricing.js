export const WORST_CASE_NOTE_PRICE = 37;

export function getNoteBasePrice(totalTokens) {
    const tokens = Number(totalTokens);
    if (!Number.isFinite(tokens) || tokens < 0) {
        throw new Error('Invalid note token count.');
    }

    if (tokens <= 25000) return 9;
    if (tokens <= 50000) return 17;
    if (tokens <= 75000) return 29;
    return WORST_CASE_NOTE_PRICE;
}
