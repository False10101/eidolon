
export function formatTimeAgo(createdAtISO) {
    if (!createdAtISO) {
        return "generated some time ago";
    }

    const pastDate = new Date(createdAtISO);
    const now = new Date();
    let differenceInMs = now.getTime() - pastDate.getTime();

    if (differenceInMs < 0) {
        return "generated just now";
    }

    const msInAMinute = 60 * 1000;
    const msInAnHour = 60 * msInAMinute;
    const msInADay = 24 * msInAnHour;

    const days = Math.floor(differenceInMs / msInADay);
    differenceInMs %= msInADay;

    const hours = Math.floor(differenceInMs / msInAnHour);
    differenceInMs %= msInAnHour;

    const minutes = Math.floor(differenceInMs / msInAMinute);

    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    
    // Only show minutes if it's the only unit or there are other units
    if (minutes > 0 || parts.length === 0) {
        parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }
    
    if (parts.length === 0) {
        return "just now";
    }

    return `${parts.join(', ')} ago`;
}