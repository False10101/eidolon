import redis from '@/lib/redis';

export const COUNTRY_CURRENCY = {
    TH: { currency: 'THB', symbol: '฿', locale: 'th-TH' },
    JP: { currency: 'JPY', symbol: '¥', locale: 'ja-JP' },
    KR: { currency: 'KRW', symbol: '₩', locale: 'ko-KR' },
    CN: { currency: 'CNY', symbol: '¥', locale: 'zh-CN' },
    ID: { currency: 'IDR', symbol: 'Rp', locale: 'id-ID' },
    VN: { currency: 'VND', symbol: '₫', locale: 'vi-VN' },
    MY: { currency: 'MYR', symbol: 'RM', locale: 'ms-MY' },
    GB: { currency: 'GBP', symbol: '£', locale: 'en-GB' },
    AU: { currency: 'AUD', symbol: 'A$', locale: 'en-AU' },
    NZ: { currency: 'NZD', symbol: 'NZ$', locale: 'en-NZ' },
    IN: { currency: 'INR', symbol: '₹', locale: 'en-IN' },
    DE: { currency: 'EUR', symbol: '€', locale: 'de-DE' },
    FR: { currency: 'EUR', symbol: '€', locale: 'fr-FR' },
    ES: { currency: 'EUR', symbol: '€', locale: 'es-ES' },
    IT: { currency: 'EUR', symbol: '€', locale: 'it-IT' },
    NL: { currency: 'EUR', symbol: '€', locale: 'nl-NL' },
    BR: { currency: 'BRL', symbol: 'R$', locale: 'pt-BR' },
    MX: { currency: 'MXN', symbol: 'MX$', locale: 'es-MX' },
    SG: { currency: 'SGD', symbol: 'S$', locale: 'en-SG' },
    HK: { currency: 'HKD', symbol: 'HK$', locale: 'zh-HK' },
    PH: { currency: 'PHP', symbol: '₱', locale: 'fil-PH' },
    MM: { currency: 'MMK', symbol: 'K', locale: 'my-MM' },
};

const FALLBACK_RATES = {
    THB: 35.0, JPY: 151.0, KRW: 1340.0, CNY: 7.24,
    IDR: 15800, VND: 25400, MYR: 4.72, GBP: 0.79,
    AUD: 1.53, NZD: 1.63, INR: 83.5, EUR: 0.92,
    BRL: 5.05, MXN: 17.2, SGD: 1.34, HKD: 7.82,
    PHP: 56.5, MMK: 2100,
};

const FX_CACHE_TTL = 60 * 60 * 24;
const GEO_CACHE_TTL = 60 * 60 * 24 * 7;

export const USD_RESPONSE = { currency: 'USD', symbol: '$', rate: 1, locale: 'en-US' };

export async function getCountryFromIp(ip) {
    const cacheKey = `geo:${ip}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return cached;
    } catch (_) {}

    try {
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
            signal: AbortSignal.timeout(3000),
        });
        const data = await res.json();
        const code = data.countryCode ?? null;
        if (code) await redis.setex(cacheKey, GEO_CACHE_TTL, code).catch(() => {});
        return code;
    } catch (_) {
        return null;
    }
}

export async function getFxRate(currency) {
    if (currency === 'USD') return 1;

    const cacheKey = `fx:USD:${currency}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return parseFloat(cached);
    } catch (_) {}

    try {
        const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currency}`, {
            signal: AbortSignal.timeout(3000),
        });
        const data = await res.json();
        const rate = data.rates?.[currency];
        if (rate) {
            await redis.setex(cacheKey, FX_CACHE_TTL, rate.toString()).catch(() => {});
            return rate;
        }
    } catch (_) {}

    return FALLBACK_RATES[currency] ?? null;
}

export async function getFxResponseForRequest(req) {
    if (process.env.NODE_ENV === 'development' && process.env.DEV_COUNTRY) {
        const meta = COUNTRY_CURRENCY[process.env.DEV_COUNTRY];
        if (!meta) return USD_RESPONSE;
        const rate = await getFxRate(meta.currency);
        return rate ? { ...meta, rate } : USD_RESPONSE;
    }

    const ip = req.headers.get('x-real-ip')
        ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? null;

    if (!ip) return USD_RESPONSE;

    const countryCode = await getCountryFromIp(ip);
    const meta = countryCode ? (COUNTRY_CURRENCY[countryCode] ?? null) : null;
    if (!meta) return USD_RESPONSE;

    const rate = await getFxRate(meta.currency);
    return rate ? { ...meta, rate } : USD_RESPONSE;
}
