export function formatTimeAgo(createdAtISO) {
    if (!createdAtISO) {
        return "some time ago";
    }

    // new Date(createdAtISO) correctly parses the UTC string and creates a Date object.
    // All subsequent calculations with this object will be relative to the user's local timezone.


    const pastDate = new Date(createdAtISO);

    console.log(pastDate);
    
    // new Date() creates a date object for the current time in the user's timezone.
    const now = new Date();
    console.log(now);

    // The difference is calculated in milliseconds, correctly accounting for timezones.
    let differenceInMs = now.getTime() - pastDate.getTime();

    // If the date is in the future (e.g., due to a slight clock skew), show "just now".
    if (differenceInMs < 0) {
        return "just now";
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
    if (days > 0) {
        parts.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    if (hours > 0) {
        parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }
    
    // This logic now correctly shows minutes alongside hours or days for better precision.
    if (minutes > 0 && days === 0) { // Only show minutes if less than a day old
        parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }
    
    if (parts.length === 0) {
        return "just now";
    }

    // We only show the two most significant units for clarity (e.g., "1 day, 5 hours ago" instead of "1 day, 5 hours, 30 minutes ago")
    return `${parts.slice(0, 2).join(', ')} ago`;
}
