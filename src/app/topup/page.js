// src/app/topup/page.js
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import CreditIcon from '../CreditIcon';
import { useTranslations } from 'next-intl';

// ─── Motion ────────────────────────────────────────────────────────────────────
const containerVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Packages ──────────────────────────────────────────────────────────────────
const PACKAGES = [
    { amount: 1.50, credits: 120,  label: '$1.50', desc: '~13 note generations',  badge: null },
    { amount: 5,    credits: 500,  label: '$5',    desc: '~55 note generations',  badge: null },
    { amount: 10,   credits: 1100, label: '$10',   desc: '~122 note generations', badge: { text: '+100 bonus', style: 'bonus' } },
    { amount: 25,   credits: 3000, label: '$25',   desc: '~333 note generations', badge: { text: '+500 bonus', style: 'best'  } },
];

const BADGE_STYLES = {
    bonus: 'border border-[rgba(34,197,94,0.2)]  bg-[rgba(34,197,94,0.1)]  text-[#22c55e]',
    best:  'border border-[rgba(0,212,200,0.2)]  bg-[rgba(0,212,200,0.1)]  text-[var(--accent)]',
};

const MIN_CUSTOM = 1.50;
const MAX_CUSTOM = 1000;

// ─── FX Helpers ───────────────────────────────────────────────────────────────
function formatLocal(usdAmount, fx) {
    if (!fx || fx.currency === 'USD') return null;
    try {
        return new Intl.NumberFormat(fx.locale, {
            style:               'currency',
            currency:            fx.currency,
            maximumFractionDigits: 0,
        }).format(Math.round(usdAmount * fx.rate));
    } catch (_) {
        return `${fx.symbol}${Math.round(usdAmount * fx.rate).toLocaleString()}`;
    }
}

// {t("customAmount")} → estimated credits (base rate 100 cr/$1)
function estimateCredits(usdAmount) {
    return Math.round(usdAmount * 100);
}

// ─── Package Card ──────────────────────────────────────────────────────────────
function PackageCard({ pkg, selected, onSelect, fx, t }) {
    const isSelected = selected === pkg.amount;
    const localStr   = formatLocal(pkg.amount, fx);

    return (
        <button
            onClick={() => onSelect(pkg.amount)}
            className={`w-full text-left rounded-xl border px-4 py-2.5 transition-all duration-150 cursor-pointer
                ${isSelected
                    ? 'border-[rgba(0,212,200,0.35)] bg-[rgba(0,212,200,0.06)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[rgba(0,212,200,0.2)] hover:bg-[rgba(0,212,200,0.03)]'
                }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    {/* Top row: credits + badge */}
                    <div className="flex items-center gap-2">
                        <CreditIcon size={15} color={isSelected ? '#00d4c8' : 'var(--fg-2)'} />
                        <span className="font-mono text-[17px] font-medium text-[var(--fg)]">{pkg.credits.toLocaleString()}</span>
                        {pkg.badge && (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${BADGE_STYLES[pkg.badge.style]}`}>
                                {pkg.badge.text.replace('bonus', t('bonus'))}
                            </span>
                        )}
                    </div>
                    {/* USD — secondary dim */}
                    <span className="font-mono text-[11.5px] text-[var(--fg-4)]">
                        {localStr ? `≈ ${localStr} (${pkg.label})` : pkg.label}
                    </span>
                </div>
                <div className={`h-[18px] w-[18px] flex-shrink-0 rounded-full border flex items-center justify-center transition-all duration-150 ml-3
                    ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-strong)]'}`}>
                    {isSelected && (
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 stroke-[var(--on-accent)] fill-none stroke-[3]">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </div>
            </div>
            <div className="mt-1 text-[11px] text-[var(--fg-3)]">{pkg.desc.replace('note generations', t('noteGenerations'))}</div>
        </button>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
function TopupPage() {
    const searchParams = useSearchParams();
  const t = useTranslations("topup");
    const { getAccessTokenSilently } = useAuth0();

    const [balance, setBalance]         = useState(null);
    const [loading, setLoading]         = useState(true);
    const [fx, setFx]                   = useState(null);
    const [selected, setSelected]       = useState(5);
    const [customAmt, setCustomAmt]     = useState('');
    const [customFocus, setCustomFocus] = useState(false);
    const [customError, setCustomError] = useState(null);
    const [paying, setPaying]           = useState(false);
    const [toast, setToast]             = useState(null);

    // ── Fetch balance ─────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const token = await getAccessTokenSilently();
                const res   = await fetch('/api/profile/balance', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                setBalance(data.balance);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchBalance();
    }, [getAccessTokenSilently]);

    // ── Fetch FX rate ─────────────────────────────────────────────────────────
    useEffect(() => {
        fetch('/api/topup/fx-rate')
            .then(r => r.json())
            .then(data => setFx(data))
            .catch(() => setFx({ currency: 'USD', symbol: '$', rate: 1, locale: 'en-US' }));
    }, []);

    // ── Handle Stripe return ──────────────────────────────────────────────────
    useEffect(() => {
        const result = searchParams.get('topup');
        if (result === 'success') {
            showToast(t('paymentSuccessful'));
            getAccessTokenSilently()
                .then(token => fetch('/api/profile/balance', { headers: { Authorization: `Bearer ${token}` } }))
                .then(r => r.json())
                .then(d => setBalance(d.balance))
                .catch(() => {});
        } else if (result === 'cancel') {
            showToast(t('paymentCancelled'));
        }
    }, [searchParams]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const isCustomActive = selected === null;

    const handleSelectPreset = (amount) => {
        setSelected(amount);
        setCustomAmt('');
        setCustomError(null);
    };

    const handleCustomFocus = () => {
        setSelected(null);
        setCustomFocus(true);
    };

    const handleCustomChange = (e) => {
        const val = e.target.value;
        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
            setCustomAmt(val);
            setCustomError(null);
        }
    };

    const handleCustomBlur = () => {
        setCustomFocus(false);
        const num = parseFloat(customAmt);
        if (customAmt === '' || isNaN(num)) return;
        if (num < MIN_CUSTOM) setCustomError(`Minimum top-up is $${MIN_CUSTOM.toFixed(2)}`);
        else if (num > MAX_CUSTOM) setCustomError(`Maximum top-up is $${MAX_CUSTOM.toLocaleString()}`);
    };

    const resolvedAmount  = isCustomActive ? (parseFloat(customAmt) || null) : selected;
    const customValid     = isCustomActive && resolvedAmount !== null && resolvedAmount >= MIN_CUSTOM && resolvedAmount <= MAX_CUSTOM;
    const canPay          = isCustomActive ? customValid : !!selected;

    // Credits to receive
    const resolvedCredits = isCustomActive
        ? (resolvedAmount ? estimateCredits(resolvedAmount) : null)
        : PACKAGES.find(p => p.amount === selected)?.credits ?? null;

    // Balance after in credits
    const afterBalance = resolvedCredits !== null
        ? ((parseInt(balance) || 0) + resolvedCredits)
        : null;

    // USD label
    const usdLabel = resolvedAmount != null
        ? `$${Number.isInteger(resolvedAmount) ? resolvedAmount : resolvedAmount.toFixed(2)}`
        : null;

    // Local currency
    const resolvedLocal = resolvedAmount ? formatLocal(resolvedAmount, fx) : null;
    const isUsd = !fx || fx.currency === 'USD';

    // ── Pay ───────────────────────────────────────────────────────────────────
    const handlePay = async () => {
        if (paying || !canPay) return;
        setPaying(true);
        try {
            const token = await getAccessTokenSilently();
            const res   = await fetch('/api/topup/create-session', {
                method:  'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body:    JSON.stringify({ amount: resolvedAmount }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            window.location.href = data.url;
        } catch (err) {
            showToast(err.message ?? 'Something went wrong. Please try again.');
            setPaying(false);
        }
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">
            <Navbar />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex flex-1 overflow-hidden min-w-0">

                    {/* ── Left panel ── */}
                    <div className="flex w-[300px] flex-shrink-0 flex-col border-r border-[var(--border-faint)]">

                        <div className="flex-shrink-0 px-6 pt-6 pb-5 border-b border-[var(--border)]">
                            <h1 className="font-serif text-[19px] font-normal tracking-[-0.02em] text-[var(--fg)]">
                                {t('title')}
                            </h1>
                            <p className="mt-0.5 text-[12px] text-[var(--fg-3)]">
                                {t("subtitle")}
                            </p>
                        </div>

                        <div
                            className="flex-1 overflow-hidden px-4 py-4 flex flex-col gap-2.5"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
                        >
                            {PACKAGES.map(pkg => (
                                <PackageCard
                                    key={pkg.amount}
                                    pkg={pkg}
                                    selected={selected}
                                    onSelect={handleSelectPreset}
                                    fx={fx}
                                    t={t}
                                />
                            ))}

                            {/* ── {t("customAmount")} ── */}
                            <div className={`rounded-xl border px-4 py-3.5 transition-all duration-150
                                ${isCustomActive
                                    ? 'border-[rgba(0,212,200,0.35)] bg-[rgba(0,212,200,0.06)]'
                                    : customFocus
                                        ? 'border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.03)]'
                                        : 'border-[var(--border)] bg-[var(--surface)]'
                                }`}>
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-[12.5px] font-medium text-[var(--fg)]">{t("customAmount")}</span>
                                    <div className={`h-[18px] w-[18px] flex-shrink-0 rounded-full border flex items-center justify-center transition-all
                                        ${isCustomActive && customValid ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-strong)]'}`}>
                                        {isCustomActive && customValid && (
                                            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 stroke-[var(--on-accent)] fill-none stroke-[3]">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-[13px] text-[var(--fg-3)] pointer-events-none select-none">$</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={customAmt}
                                        onFocus={handleCustomFocus}
                                        onBlur={handleCustomBlur}
                                        onChange={handleCustomChange}
                                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] pl-7 pr-3 py-2 font-mono text-[13px] text-[var(--fg)] placeholder-[var(--fg-3)] outline-none transition-all focus:border-[rgba(0,212,200,0.3)]"
                                    />
                                </div>
                                {/* Credit estimate for custom */}
                                {isCustomActive && resolvedAmount && !customError && (
                                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--fg-3)]">
                                        <CreditIcon size={11} color="#9a9aaa" />
                                        <span>{estimateCredits(resolvedAmount).toLocaleString()} {t('creditsLabel')}</span>
                                        {!isUsd && resolvedLocal && (
                                            <span className="ml-1 text-[var(--fg-4)]">· ≈ {resolvedLocal}</span>
                                        )}
                                    </div>
                                )}
                                {customError ? (
                                    <div className="mt-1.5 text-[11px] text-[#ef4444]">{customError}</div>
                                ) : !isCustomActive || (!resolvedAmount && !customError) ? (
                                    <div className="mt-1.5 text-[11px] text-[var(--fg-3)]">
                                        {t('min')} ${MIN_CUSTOM.toFixed(2)} · {t('max')} ${MAX_CUSTOM.toLocaleString()}
                                    </div>
                                ) : null}
                            </div>

                            {/* FX notice */}
                            {!isUsd && (
                                <div className="flex items-start gap-2 rounded-lg border border-[var(--border-faint)] bg-[var(--surface)] px-3 py-2.5">
                                    <svg viewBox="0 0 24 24" className="h-3 w-3 flex-shrink-0 mt-0.5 stroke-[var(--fg-3)] fill-none stroke-[1.6]">
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                                    </svg>
                                    <span className="text-[10.5px] text-[var(--fg-4)] leading-[1.6]">
                                        {t('fxNotice')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Balance footer */}
                        <div className="flex-shrink-0 px-5 py-4 border-t border-[var(--border)]">
                            <div className="flex items-center justify-between rounded-lg border border-[rgba(0,212,200,0.12)] bg-[rgba(0,212,200,0.04)] px-3.5 py-2.5">
                                <span className="text-[12px] text-[var(--fg-3)]">{t("currentBalance")}</span>
                                <div className="flex items-center gap-1.5">
                                    <CreditIcon size={13} />
                                    <span className="font-mono text-[14px] font-medium text-[var(--accent)]">
                                        {loading ? '—' : parseInt(balance).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right panel ── */}
                    <div className="flex flex-1 flex-col overflow-hidden min-w-0">

                        {/* Toolbar */}
                        <div className="flex-shrink-0 flex items-center justify-between px-7 py-4 border-b border-[var(--border)] bg-[var(--surface-raised)]">
                            <span className="text-[13px] font-medium text-[var(--fg-2)]">{t("paymentViaStripe")}</span>
                            <div className="flex items-center gap-1.5 text-[11px] text-[var(--fg-3)]">
                                <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-[#22c55e] fill-none stroke-[1.8]">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                {t("sslEncrypted")}
                            </div>
                        </div>

                        <motion.div
                            className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {/* Order summary */}
                            <motion.div variants={itemVariants}>
                                <div className="mb-3 text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)] select-none">
                                    {t('orderSummary')}
                                </div>
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-faint)]">
                                        <span className="text-[12.5px] text-[var(--fg-3)]">{t('credits')}</span>
                                        <div className="flex items-center gap-1.5">
                                            {resolvedCredits ? (
                                                <>
                                                    <CreditIcon size={13} />
                                                    <span className="font-mono text-[12.5px] font-medium text-[var(--fg)]">
                                                        {resolvedCredits.toLocaleString()}
                                                    </span>
                                                </>
                                            ) : <span className="text-[12.5px] text-[var(--fg-4)]">—</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-faint)]">
                                        <span className="text-[12.5px] text-[var(--fg-3)]">{t('balanceAfter')}</span>
                                        <div className="flex items-center gap-1.5">
                                            {afterBalance !== null ? (
                                                <>
                                                    <CreditIcon size={13} />
                                                    <span className="font-mono text-[12.5px] font-medium text-[var(--accent)]">
                                                        {afterBalance.toLocaleString()}
                                                    </span>
                                                </>
                                            ) : <span className="text-[12.5px] text-[var(--fg-4)]">—</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3.5 bg-[rgba(0,212,200,0.03)]">
                                        <span className="text-[13px] font-medium text-[var(--fg)]">{t('totalCharged')}</span>
                                        <div className="flex items-center gap-2">
                                            {!isUsd && resolvedLocal && (
                                                <span className="font-mono text-[15px] font-medium text-[var(--accent)]">≈ {resolvedLocal}</span>
                                            )}
                                            <span className={`font-mono ${!isUsd && resolvedLocal ? 'text-[12px] text-[var(--fg-4)]' : 'text-[15px] font-medium text-[var(--accent)]'}`}>
                                                {usdLabel ? (isUsd ? usdLabel : `(${usdLabel})`) : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Payment method */}
                            <motion.div variants={itemVariants}>
                                <div className="mb-3 text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)] select-none">
                                    {t('paymentMethod')}
                                </div>
                                <div className="rounded-xl border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.04)] p-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.1)]">
                                            <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[#818cf8] fill-none stroke-[1.8]">
                                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                                <line x1="2" y1="10" x2="22" y2="10" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-[13px] font-medium text-[var(--fg)]">{t('creditDebitCard')}</div>
                                            <div className="mt-0.5 text-[11.5px] text-[var(--fg-3)]">
                                                {t('poweredByStripe')}
                                            </div>
                                        </div>
                                        <div className="ml-auto flex items-center gap-1.5">
                                            {['VISA', 'MASTERCARD'].map(brand => (
                                                <div key={brand}
                                                    className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-0.5 text-[9.5px] font-bold"
                                                    style={{ color: brand === 'VISA' ? '#1a72bb' : '#eb001b' }}
                                                >
                                                    {brand}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5">
                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 stroke-[var(--fg-3)] fill-none stroke-[1.6]">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="16" x2="12" y2="12" />
                                            <line x1="12" y1="8" x2="12.01" y2="8" />
                                        </svg>
                                        <span className="text-[11.5px] text-[var(--fg-3)]">
                                            {t('redirect_msg')}
                                        </span>
                                    </div>

                                    <button
                                        onClick={handlePay}
                                        disabled={paying || !canPay}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-[13.5px] font-semibold text-[var(--on-accent)] transition-all hover:bg-[var(--accent-hover)] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {paying ? (
                                            <>
                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--on-accent)]/30 border-t-[#0c0c0e]" />
                                                {t('redirectingToStripe')}
                                            </>
                                        ) : (
                                            <>
                                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.2]">
                                                    <rect x="2" y="5" width="20" height="14" rx="2" />
                                                    <line x1="2" y1="10" x2="22" y2="10" />
                                                </svg>
                                                {canPay
                                                    ? `${t('payWithCard')} ${!isUsd && resolvedLocal ? `≈ ${resolvedLocal} ` : ''}${usdLabel ? `(${usdLabel})` : ''}`
                                                    : t('selectAnAmount')
                                                }
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>

                            {/* Info box */}
                            <motion.div variants={itemVariants}
                                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 flex flex-col gap-1.5"
                            >
                                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)] opacity-60 mb-1 select-none">
                                    {t('goodToKnow')}
                                </div>
                                {[
                                    t('creditsAddedInstantly'),
                                    t('processedSecurely'),
                                    t('pricingInUsd'),
                                    t('nonRefundable'),
                                ].map((note, i) => (
                                    <div key={i} className="flex items-start gap-2 text-[11.5px] text-[var(--fg-3)]">
                                        <span className="mt-[5px] h-[4px] w-[4px] flex-shrink-0 rounded-full bg-[var(--fg-3)]" />
                                        {note}
                                    </div>
                                ))}
                            </motion.div>

                        </motion.div>
                    </div>
                </main>
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{    opacity: 0, y: 6 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2 text-[12.5px] text-[var(--fg-2)] shadow-lg"
                    >
                        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-[#22c55e] fill-none stroke-[2.2]">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function Topup() {
    return (
        <Suspense>
            <TopupPage />
        </Suspense>
    );
}