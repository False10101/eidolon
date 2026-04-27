// src/app/pricing/page.js
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import { useRouter } from 'next/navigation';
import CreditIcon from '../CreditIcon';

// ─── Pricing data ──────────────────────────────────────────────────────────────
const NOTE_TIERS = [
  { range: 'Under 25k tokens', strong: 'Under 25k', badge: 'Tier 1', badgeClass: 'green', price: 9 },
  { range: '25k – 50k tokens', strong: '25k – 50k', badge: 'Tier 2', badgeClass: 'amber', price: 17 },
  { range: '50k – 75k tokens', strong: '50k – 75k', badge: 'Tier 3', badgeClass: 'orange', price: 29 },
  { range: '75k – 100k tokens', strong: '75k – 100k', badge: 'Tier 4', badgeClass: 'red', price: 37, sub: 'Hard capped at 100k tokens' },
];

const TRANSCRIPT_TIERS = [
  { range: 'Under 1 hour', strong: 'Under 1 hour', badge: 'Tier 1', badgeClass: 'green', prem: 11, turbo: 7 },
  { range: '1 – 2 hours', strong: '1 – 2 hours', badge: 'Tier 2', badgeClass: 'amber', prem: 22, turbo: 14 },
  { range: '2 – 3 hours', strong: '2 – 3 hours', badge: 'Tier 3', badgeClass: 'orange', prem: 33, turbo: 21 },
  { range: 'Over 3 hours', strong: 'Over 3 hours', badge: 'Tier 4', badgeClass: 'red', prem: null, turbo: null, perHrPrem: 11, perHrTurbo: 7, sub: 'Hard capped at 10 hours' },
];

const GROUP_TIERS = [
  {
    name: 'Small', members: 5, perMemberOff: '15%',
    tiers: [
      { badge: 'Tier 1', badgeClass: 'green', range: 'Under 25k tokens', price: 37 },
      { badge: 'Tier 2', badgeClass: 'amber', range: '25k – 50k tokens', price: 74 },
      { badge: 'Tier 3', badgeClass: 'orange', range: '50k – 75k tokens', price: 120 },
      { badge: 'Tier 4', badgeClass: 'red', range: '75k – 100k tokens', price: 160 },
    ],
  },
  {
    name: 'Study', members: 10, perMemberOff: '25%',
    tiers: [
      { badge: 'Tier 1', badgeClass: 'green', range: 'Under 25k tokens', price: 65 },
      { badge: 'Tier 2', badgeClass: 'amber', range: '25k – 50k tokens', price: 130 },
      { badge: 'Tier 3', badgeClass: 'orange', range: '50k – 75k tokens', price: 215 },
      { badge: 'Tier 4', badgeClass: 'red', range: '75k – 100k tokens', price: 280 },
    ],
  },
  {
    name: 'Class', members: 25, perMemberOff: '40%',
    tiers: [
      { badge: 'Tier 1', badgeClass: 'green', range: 'Under 25k tokens', price: 130 },
      { badge: 'Tier 2', badgeClass: 'amber', range: '25k – 50k tokens', price: 255 },
      { badge: 'Tier 3', badgeClass: 'orange', range: '50k – 75k tokens', price: 430 },
      { badge: 'Tier 4', badgeClass: 'red', range: '75k – 100k tokens', price: 555 },
    ],
  },
  {
    name: 'Faculty', members: 50, perMemberOff: '60%',
    tiers: [
      { badge: 'Tier 1', badgeClass: 'green', range: 'Under 25k tokens', price: 170 },
      { badge: 'Tier 2', badgeClass: 'amber', range: '25k – 50k tokens', price: 345 },
      { badge: 'Tier 3', badgeClass: 'orange', range: '50k – 75k tokens', price: 570 },
      { badge: 'Tier 4', badgeClass: 'red', range: '75k – 100k tokens', price: 745 },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'When does my balance get charged?',
    a: <>Your credit balance is checked and deducted <strong className="text-[var(--fg)] font-medium">at the moment you generate</strong> a note or run transcription. If your balance is too low, <strong className="text-[var(--fg)] font-medium">the generation won't start</strong> — you'll see an error asking you to top up first.</>,
  },
  {
    q: 'Do credits expire?',
    a: <>No. Credits <strong className="text-[var(--fg)] font-medium">never expire</strong> and carry over indefinitely.</>,
  },
  {
    q: 'How does group billing work?',
    a: <>Costs are split automatically across all group members. If anyone lacks sufficient credits, the generation won't run. The member who clicks generate gets a <strong className="text-[var(--fg)] font-medium">50% discount</strong> on their share, subsidized by the rest of the group.</>,
  },
  {
    q: 'Why do note costs vary? What determines my tier?',
    a: <>Notes are charged based on <strong className="text-[var(--fg)] font-medium">total token count</strong> (input transcript + AI output combined). Longer lectures with denser content produce more tokens. A typical 2–3 hour lecture usually falls in <strong className="text-[var(--fg)] font-medium">Tier 2 (17 credits)</strong>.</>,
  },
  {
    q: 'Why is transcription priced separately from notes?',
    a: <>Transcription uses Whisper (priced by audio duration), while notes use a language model priced by token count. They run independently — if you already have a transcript, <strong className="text-[var(--fg)] font-medium">you skip transcription cost entirely</strong>.</>,
  },
  {
    q: 'How do I top up?',
    a: <>Top up with any major credit or debit card via Stripe. Credits are added <strong className="text-[var(--fg)] font-medium">instantly</strong> after payment confirmation.</>,
  },
];

const TOPUP_PRESETS = [
  { amount: 120, label: '$1.50', hint: '~13 notes' },
  { amount: 450, label: '$5', hint: '~50 notes' },
  { amount: 1200, label: '$10', hint: '~133 notes', popular: true },
  { amount: 2800, label: '$25', hint: '~311 notes' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const badgeColors = {
  green: 'bg-[rgba(34,197,94,0.1)]   text-[#22c55e] border-[rgba(34,197,94,0.2)]',
  amber: 'bg-[rgba(245,158,11,0.1)]  text-[#f59e0b] border-[rgba(245,158,11,0.2)]',
  orange: 'bg-[rgba(249,115,22,0.08)] text-[#f97316] border-[rgba(249,115,22,0.2)]',
  red: 'bg-[rgba(239,68,68,0.1)]   text-[#ef4444] border-[rgba(239,68,68,0.2)]',
};

// Inline credit display: number + icon side by side
function Cr({ amount, size = 13, iconSize = 12, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 font-mono font-medium text-[var(--accent)] ${className}`} style={{ fontSize: size }}>
      {amount}
      <CreditIcon size={iconSize} />
    </span>
  );
}

// Note: getNoteTier returns idx, which we use to index into the localized NOTE_TIERS array inside the component.
function getNoteTierIdx(tokens) {
  if (tokens <= 25000) return 0;
  if (tokens <= 50000) return 1;
  if (tokens <= 75000) return 2;
  return 3;
}

// ─── Pricing Data ──────────────────────────────────────────────────────────────
const TRANSCRIPT_PRICES = [
  { prem: 11, turbo: 7 },
  { prem: 22, turbo: 14 },
  { prem: 33, turbo: 21 },
  { prem: null, turbo: null, perHrPrem: 11, perHrTurbo: 7 },
];

function calcTranscriptCost(durIdx, exactHours, model) {
  if (durIdx === 3) return Math.ceil(exactHours) * (model === 'prem' ? 11 : 7);
  return model === 'prem' ? TRANSCRIPT_PRICES[durIdx].prem : TRANSCRIPT_PRICES[durIdx].turbo;
}

// ─── Motion ────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="mb-2.5 text-[10px] uppercase tracking-[0.1em] text-[var(--fg-3)] opacity-90 select-none">
      {children}
    </div>
  );
}

function TierRow({ t, model }) {
  const isT4 = t.perHrPrem !== undefined;
  const perHr = model === 'prem' ? t.perHrPrem : t.perHrTurbo;
  const price = t.price ?? (model === 'prem' ? t.prem : t.turbo);  // ← add this


  return (
    <div
      className="grid gap-3 border-b border-[var(--border-faint)] px-[18px] py-[9px] last:border-0 transition-colors hover:bg-[var(--surface-tint-faint)]"
      style={{ gridTemplateColumns: '1fr auto auto', alignItems: 'center' }}
    >
      <div className="text-[12.5px] text-[var(--fg-2)]">
        {t.strong
          ? <>{t.range.split(t.strong)[0]}<strong className="text-[var(--fg)] font-medium">{t.strong}</strong>{t.range.split(t.strong)[1]}</>
          : t.range}
        {t.sub && <span className="block mt-0.5 text-[11px] text-[#c8a96e]">{t.sub}</span>}
      </div>
      <span className={`rounded-full border px-[7px] py-0.5 text-[10px] uppercase tracking-[0.06em] ${badgeColors[t.badgeClass]}`}>
        {t.badge}
      </span>
      <span className="w-[90px] flex items-center justify-end gap-1 font-mono text-[13px] font-medium text-[var(--accent)]">
        {isT4 ? (
          <><Cr amount={perHr} size={13} iconSize={12} /><span className="text-[var(--fg-3)] font-normal text-[11px]">{t.perHrLabel || '/hr'}</span></>
        ) : (
          <Cr amount={price} size={13} iconSize={12} />
        )}
      </span>
    </div>
  );
}

function TierBlock({ title, icon, headerRight, tiers, model }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface noise">
      <div className="flex h-[52px] items-center justify-between border-b border-[var(--border)] px-[18px]">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--fg)]">
          {icon}{title}
        </div>
        {headerRight}
      </div>
      {tiers.map((t, i) => <TierRow key={i} t={t} model={model} />)}
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(v => !v)} className="w-full text-left bg-[var(--surface)]">
      <div className={`flex items-center justify-between gap-3 px-[18px] py-3.5 text-[13px] transition-colors ${open ? 'text-[var(--fg)]' : 'text-[var(--fg-2)] hover:text-[var(--fg)]'}`}>
        <span>{q}</span>
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 flex-shrink-0 stroke-[var(--fg-3)] fill-none stroke-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-96 pb-3.5' : 'max-h-0'}`}>
        <p className="px-[18px] text-left text-[13px] leading-[1.7] text-[var(--fg-3)]">{a}</p>
      </div>
    </button>
  );
}

function BalanceInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] opacity-70">{label}</div>
      <div className="flex overflow-hidden rounded-lg border border-[var(--border)] focus-within:border-[rgba(0,212,200,0.35)] transition-colors">
        <div className="flex items-center border-r border-[var(--border)] bg-[var(--surface-deep)] px-3 py-2">
          <CreditIcon size={13} color="#9a9aaa" />
        </div>
        <input
          type="number" value={value} min="0" max="99999"
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 bg-[var(--surface-raised)] px-3 py-2 font-mono text-[14px] text-[var(--fg)] outline-none"
        />
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Pricing() {
  const [calcTab, setCalcTab] = useState('notes');
  const [tokenSlider, setTokenSlider] = useState(20000);
  const [balanceNotes, setBalanceNotes] = useState(450);
  const [durIdx, setDurIdx] = useState(0);
  const [txModel, setTxModel] = useState('turbo');
  const [exactHours, setExactHours] = useState(4);
  const [balanceTx, setBalanceTx] = useState(450);
  const [pipeDurIdx, setPipeDurIdx] = useState(0);
  const [pipeTokens, setPipeTokens] = useState(20000);
  const [balancePipe, setBalancePipe] = useState(450);
  const [selectedTopup, setSelectedTopup] = useState(1200);
  const [calcTxModel, setCalcTxModel] = useState('turbo');
  const [pipeTxModel, setPipeTxModel] = useState('turbo');
  const [pipeExactHours, setPipeExactHours] = useState(4);
  const router = useRouter();

  const t = useTranslations('pricingPage');

  const NOTE_TIERS = [
    { range: t('under25k'), strong: '25k', badge: t('tier1'), badgeClass: 'green', price: 9 },
    { range: t('25kTo50k'), strong: '50k', badge: t('tier2'), badgeClass: 'amber', price: 17 },
    { range: t('50kTo75k'), strong: '75k', badge: t('tier3'), badgeClass: 'orange', price: 29 },
    { range: t('75kTo100k'), strong: '100k', badge: t('tier4'), badgeClass: 'red', price: 37, sub: t('cap100k') },
  ];

  const TRANSCRIPT_TIERS = [
    { range: t('under1hr'), strong: '1', badge: t('tier1'), badgeClass: 'green', prem: 11, turbo: 7 },
    { range: t('1To2hr'), strong: '2', badge: t('tier2'), badgeClass: 'amber', prem: 22, turbo: 14 },
    { range: t('2To3hr'), strong: '3', badge: t('tier3'), badgeClass: 'orange', prem: 33, turbo: 21 },
    { range: t('over3hr'), strong: '3', badge: t('tier4'), badgeClass: 'red', prem: null, turbo: null, perHrPrem: 11, perHrTurbo: 7, sub: t('cap10hr'), perHrLabel: t('perHr') },
  ];

  const GROUP_TIERS = [
    {
      name: t('small'), members: 5, perMemberOff: '15%',
      tiers: [
        { badge: t('tier1'), badgeClass: 'green', range: t('under25k'), price: 37 },
        { badge: t('tier2'), badgeClass: 'amber', range: t('25kTo50k'), price: 74 },
        { badge: t('tier3'), badgeClass: 'orange', range: t('50kTo75k'), price: 120 },
        { badge: t('tier4'), badgeClass: 'red', range: t('75kTo100k'), price: 160 },
      ],
    },
    {
      name: t('study'), members: 10, perMemberOff: '25%',
      tiers: [
        { badge: t('tier1'), badgeClass: 'green', range: t('under25k'), price: 65 },
        { badge: t('tier2'), badgeClass: 'amber', range: t('25kTo50k'), price: 130 },
        { badge: t('tier3'), badgeClass: 'orange', range: t('50kTo75k'), price: 215 },
        { badge: t('tier4'), badgeClass: 'red', range: t('75kTo100k'), price: 280 },
      ],
    },
    {
      name: t('class'), members: 25, perMemberOff: '40%',
      tiers: [
        { badge: t('tier1'), badgeClass: 'green', range: t('under25k'), price: 130 },
        { badge: t('tier2'), badgeClass: 'amber', range: t('25kTo50k'), price: 255 },
        { badge: t('tier3'), badgeClass: 'orange', range: t('50kTo75k'), price: 430 },
        { badge: t('tier4'), badgeClass: 'red', range: t('75kTo100k'), price: 555 },
      ],
    },
    {
      name: t('faculty'), members: 50, perMemberOff: '60%',
      tiers: [
        { badge: t('tier1'), badgeClass: 'green', range: t('under25k'), price: 170 },
        { badge: t('tier2'), badgeClass: 'amber', range: t('25kTo50k'), price: 345 },
        { badge: t('tier3'), badgeClass: 'orange', range: t('50kTo75k'), price: 570 },
        { badge: t('tier4'), badgeClass: 'red', range: t('75kTo100k'), price: 745 },
      ],
    },
  ];

  const FAQ_ITEMS = [
    {
      q: t('q1'),
      a: <>{t('a1p1')} <strong className="text-[var(--fg)] font-medium">{t('a1h1')}</strong> {t('a1p2')} <strong className="text-[var(--fg)] font-medium">{t('a1h2')}</strong> {t('a1p3')}</>,
    },
    {
      q: t('q2'),
      a: <>{t('a2p1')} <strong className="text-[var(--fg)] font-medium">{t('a2h1')}</strong> {t('a2p2')}</>,
    },
    {
      q: t('q3'),
      a: <>{t('a3p1')} <strong className="text-[var(--fg)] font-medium">{t('a3h1')}</strong> {t('a3p2')}</>,
    },
    {
      q: t('q4'),
      a: <>{t('a4p1')} <strong className="text-[var(--fg)] font-medium">{t('a4h1')}</strong> {t('a4p2')} <strong className="text-[var(--fg)] font-medium">{t('a4h2')}</strong>.</>,
    },
    {
      q: t('q5'),
      a: <>{t('a5p1')} <strong className="text-[var(--fg)] font-medium">{t('a5h1')}</strong>.</>,
    },
    {
      q: t('q6'),
      a: <>{t('a6p1')} <strong className="text-[var(--fg)] font-medium">{t('a6h1')}</strong> {t('a6p2')}</>,
    },
  ];

  const TOPUP_PRESETS = [
    { amount: 120, label: t('preset_120Label'), hint: t('preset_120Hint') },
    { amount: 450, label: t('preset_450Label'), hint: t('preset_450Hint') },
    { amount: 1200, label: t('preset_1200Label'), hint: t('preset_1200Hint'), popular: true },
    { amount: 2800, label: t('preset_2800Label'), hint: t('preset_2800Hint') },
  ];

  // ── Calc results ─────────────────────────────────────────────────────────────
  let calcCost = 0, calcTierLabel = '', calcTierRange = '', calcTierIdx = 0, calcBreakdown = null;

  if (calcTab === 'notes') {
    const idx = getNoteTierIdx(tokenSlider);
    const tier = { idx, ...NOTE_TIERS[idx] };
    calcCost = tier.price; calcTierLabel = tier.badge; calcTierRange = tier.range; calcTierIdx = tier.idx;
  } else if (calcTab === 'transcript') {
    calcCost = calcTranscriptCost(durIdx, exactHours, calcTxModel);
    calcTierLabel = `${t('tier1').replace('1', String(durIdx + 1))}`;
    calcTierRange = durIdx === 3
      ? `${exactHours} ${t('hrs')} (${calcTxModel === 'prem' ? 11 : 7}${t('perHr')})`
      : TRANSCRIPT_TIERS[durIdx].range;
    calcTierIdx = durIdx;
  } else {
    const tCost = calcTranscriptCost(pipeDurIdx, pipeExactHours, pipeTxModel);
    const nIdx = getNoteTierIdx(pipeTokens);
    const nTier = NOTE_TIERS[nIdx];
    calcCost = tCost + nTier.price;
    calcTierLabel = t('combined'); calcTierRange = t('combinedRange');
    calcBreakdown = { t: tCost, n: nTier.price }; calcTierIdx = -1;
  }

  const activeBalance = calcTab === 'notes' ? balanceNotes : calcTab === 'transcript' ? balanceTx : balancePipe;
  const gens = calcCost > 0 ? Math.floor(activeBalance / calcCost) : 0;
  const balAfter = Math.max(0, activeBalance - calcCost);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          <motion.div
            className="flex-1 overflow-y-auto px-9 py-7 flex flex-col gap-6"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >

            {/* Header */}
            <motion.div variants={itemVariants}>
              <h1 className="font-serif text-[24px] font-normal tracking-[-0.02em] text-[var(--fg)] mb-1">
                {t('title')} <span className="text-[var(--accent)]">{t('titleAccent')}</span>
              </h1>
              <p className="text-[13px] text-[var(--fg-3)]">{t('subtitle')} <span className="text-[var(--fg)] font-medium">{t('noSub')}</span></p>
            </motion.div>

            {/* Individual tiers */}
            <motion.div variants={itemVariants}>
              <SectionLabel>{t('sectionIndividual')}</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <TierBlock
                  title={t('inclassNotes')}
                  headerRight={<span className="text-[11px] text-[var(--fg-3)]">{t('perGeneration')}</span>}
                  tiers={NOTE_TIERS}
                  icon={<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[var(--accent)] fill-none stroke-[1.8] mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                />
                <TierBlock
                  title={t('transcription')}
                  model={txModel}
                  headerRight={
                    <div className="flex rounded-md border border-[var(--border)] bg-[var(--bg)] p-[2px]">
                      {['turbo', 'prem'].map((m) => (
                        <button key={m} onClick={() => setTxModel(m)}
                          className={`rounded px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em] font-medium transition-all
                            ${txModel === m ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]' : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'}`}>
                          {m === 'prem' ? 'Premium' : 'Turbo'}
                        </button>
                      ))}
                    </div>
                  }
                  tiers={TRANSCRIPT_TIERS}
                  icon={<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[var(--accent)] fill-none stroke-[1.8] mr-2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>}
                />
              </div>
            </motion.div>

            {/* Group plans */}
            <motion.div variants={itemVariants}>
              <SectionLabel>{t('sectionGroup')}</SectionLabel>
              <div className="grid grid-cols-4 gap-3">
                {GROUP_TIERS.map((group) => {
                  const t2Cost = group.tiers[1].price;
                  const genCost = Math.round((t2Cost / group.members) * 0.5);
                  const otherCost = Math.round(t2Cost / group.members);
                  return (
                    <div key={group.name} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col surface noise">
                      <div className="flex items-center justify-between border-b border-[var(--border)] px-[18px] py-3.5">
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[var(--accent)] fill-none stroke-[1.8]">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span className="text-[13px] font-medium text-[var(--fg)]">{group.name}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[11px] text-[var(--fg-3)]">≤ {group.members} {t('members')}</span>
                          <span className="text-[10px] text-[#22c55e]">{t('offMember').replace('15%', group.perMemberOff).replace('off/member', group.perMemberOff + ' ' + t('offMember'))}</span>
                        </div>
                      </div>
                      {group.tiers.map((t, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-[var(--border-faint)] px-[18px] py-2 last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors">
                          <span className={`rounded-full border px-[7px] py-0.5 text-[10px] uppercase tracking-[0.06em] ${badgeColors[t.badgeClass]}`}>{t.badge}</span>
                          <span className="flex-1 mx-3 text-[11.5px] text-[var(--fg-3)]">{t.range}</span>
                          <Cr amount={t.price} size={13} iconSize={12} />
                        </div>
                      ))}
                      <div className="border-t border-[var(--border-faint)] px-[18px] py-3 bg-[var(--surface-tint-faint)] mt-auto">
                        <div className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-[var(--fg-2)] mb-1.5 opacity-90">{t('t2SplitExample')}</div>
                        <div className="flex flex-col gap-1 text-[11px] text-[var(--fg-3)]">
                          <div className="flex justify-between items-center">
                            <span>{t('generatorPays')}</span>
                            <Cr amount={genCost} size={12} iconSize={11} />
                          </div>
                          <div className="flex justify-between items-center">
                          <span>{t('othersPay', { count: group.members - 1 })}</span>
                            <span className="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--fg)]">
                              {otherCost}<CreditIcon size={11} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[11.5px] text-[var(--fg-3)] opacity-90">
                {t('groupGenSubtext')} <span className="text-[var(--fg)] font-medium">{t('groupGenSubtextHighlight')}</span> {t('groupGenSubtextEnd')}
              </p>
            </motion.div>

            {/* Calculator */}
            <motion.div variants={itemVariants}>
              <SectionLabel>{t('sectionCalc')}</SectionLabel>
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface noise">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-[18px] py-3.5">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--fg)]">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[var(--accent)] fill-none stroke-[1.8]">
                      <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="12" y2="14" />
                    </svg>
                    {t('estimateCost')}
                  </div>
                  <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-[3px]">
                    {['notes', 'transcript', 'pipeline'].map((tab) => (
                      <button key={tab} onClick={() => setCalcTab(tab)}
                        className={`rounded-md px-3.5 py-[5px] text-[12px] transition-all duration-150
                          ${calcTab === tab ? 'bg-[var(--surface-raised)] text-[var(--fg)] border border-[var(--border)]' : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'}`}>
                        {tab === 'notes' ? t('notesTab') : tab === 'transcript' ? t('transcriptionTab') : t('pipelineTab')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 p-[18px]">
                  <div className="flex flex-col gap-4">

                    {calcTab === 'notes' && (
                      <>
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] opacity-70">{t('estTokenCount')}</div>
                          <div className="text-[11px] text-[var(--fg-3)] opacity-85">{t('typicalLecture')} <span className="text-[var(--fg-2)] font-medium">{t('typicalTokens')}</span></div>
                          <div className="mt-1 flex flex-col gap-1.5">
                            <div className="font-mono text-[20px] font-medium text-[var(--fg)]">
                              {tokenSlider.toLocaleString()} <span className="text-[13px] text-[var(--fg-3)] font-normal">{t('tokens')}</span>
                            </div>
                            <input type="range" min="1000" max="100000" step="1000" value={tokenSlider}
                              onChange={(e) => setTokenSlider(Number(e.target.value))}
                              className="w-full accent-[var(--accent)]" style={{ height: 3 }} />
                            <div className="flex justify-between text-[10px] text-[var(--fg-3)] opacity-80 select-none">
                              <span>1k</span><span>25k</span><span>50k</span><span>75k</span><span>100k</span>
                            </div>
                          </div>
                        </div>
                        <BalanceInput label={t('yourBalance')} value={balanceNotes} onChange={setBalanceNotes} />
                      </>
                    )}

                    {calcTab === 'transcript' && (
                      <>
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] opacity-70">{t('model')}</div>
                          <div className="flex mt-1 gap-1">
                            {['turbo', 'prem'].map((m) => (
                              <button key={m} onClick={() => setCalcTxModel(m)}
                                className={`flex-1 rounded-lg border py-[7px] text-center text-[12px] uppercase tracking-[0.05em] font-medium transition-all
                                  ${calcTxModel === m
                                    ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[var(--accent)]'
                                    : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-3)] hover:border-[var(--border-hover)] hover:text-[var(--fg-2)]'}`}>
                                {m === 'prem' ? t('premium') : t('turbo')}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] opacity-70">{t('recDuration')}</div>
                          <div className="flex mt-1 gap-1">
                            {[t('under1hr_short'), t('1To2hr_short'), t('2To3hr_short'), t('3hrPlus_short')].map((label, i) => (
                              <button key={i} onClick={() => setDurIdx(i)}
                                className={`flex-1 rounded-lg border py-[7px] text-center text-[12px] transition-all
                                  ${durIdx === i
                                    ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[var(--accent)]'
                                    : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-3)] hover:border-[var(--border-hover)] hover:text-[var(--fg-2)]'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {durIdx === 3 && (
                          <div className="flex flex-col gap-1.5">
                            <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] opacity-70">{t('exactDuration')}</div>
                            <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
                              <div className="border-r border-[var(--border)] bg-[var(--surface-deep)] px-3 py-2 text-[12px] text-[var(--fg-3)] select-none">{t('hrs')}</div>
                              <input type="number" value={exactHours} min="3" max="10" step="0.5"
                                onChange={(e) => setExactHours(Number(e.target.value))}
                                className="flex-1 bg-[var(--surface-raised)] px-3 py-2 font-mono text-[14px] text-[var(--fg)] outline-none" />
                            </div>
                          </div>
                        )}
                        <BalanceInput label={t('yourBalance')} value={balanceTx} onChange={setBalanceTx} />
                      </>
                    )}

                    {calcTab === 'pipeline' && (
                      <>
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] opacity-70">{t('model')}</div>
                          <div className="flex mt-1 gap-1">
                            {['turbo', 'prem'].map((m) => (
                              <button key={m} onClick={() => setPipeTxModel(m)}
                                className={`flex-1 rounded-lg border py-[7px] text-center text-[12px] uppercase tracking-[0.05em] font-medium transition-all
                                  ${pipeTxModel === m
                                    ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[var(--accent)]'
                                    : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-3)] hover:border-[var(--border-hover)] hover:text-[var(--fg-2)]'}`}>
                                {m === 'prem' ? t('premium') : t('turbo')}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] opacity-70">{t('recDuration')}</div>
                          <div className="flex mt-1 gap-1">
                            {[t('under1hr_short'), t('1To2hr_short'), t('2To3hr_short'), t('3hrPlus_short')].map((label, i) => (
                              <button key={i} onClick={() => setPipeDurIdx(i)}
                                className={`flex-1 rounded-lg border py-[7px] text-center text-[12px] transition-all
                                  ${pipeDurIdx === i
                                    ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[var(--accent)]'
                                    : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-3)] hover:border-[var(--border-hover)] hover:text-[var(--fg-2)]'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {pipeDurIdx === 3 && (
                          <div className="flex flex-col gap-1.5">
                            <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] opacity-70">{t('exactDuration')}</div>
                            <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
                              <div className="border-r border-[var(--border)] bg-[var(--surface-deep)] px-3 py-2 text-[12px] text-[var(--fg-3)] select-none">{t('hrs')}</div>
                              <input type="number" value={pipeExactHours} min="3" max="10" step="0.5"
                                onChange={(e) => setPipeExactHours(Number(e.target.value))}
                                className="flex-1 bg-[var(--surface-raised)] px-3 py-2 font-mono text-[14px] text-[var(--fg)] outline-none" />
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] opacity-70">{t('expNoteTokens')}</div>
                          <div className="flex flex-col gap-1.5 mt-1">
                            <div className="font-mono text-[20px] font-medium text-[var(--fg)]">
                              {pipeTokens.toLocaleString()} <span className="text-[13px] text-[var(--fg-3)] font-normal">{t('tokens')}</span>
                            </div>
                            <input type="range" min="1000" max="100000" step="1000" value={pipeTokens}
                              onChange={(e) => setPipeTokens(Number(e.target.value))}
                              className="w-full accent-[var(--accent)]" style={{ height: 3 }} />
                            <div className="flex justify-between text-[10px] text-[var(--fg-3)] opacity-80 select-none">
                              <span>1k</span><span>25k</span><span>50k</span><span>75k</span><span>100k</span>
                            </div>
                          </div>
                        </div>
                        <BalanceInput label={t('yourBalance')} value={balancePipe} onChange={setBalancePipe} />
                      </>
                    )}
                  </div>

                  {/* Result panel */}
                  <div className="flex flex-col gap-3 border-l border-[var(--border)] pl-6">
                    <div className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-4 surface-teal">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-3)] opacity-90">{t('costPerGen')}</div>
                      <div className="flex items-center gap-2 my-1.5">
                        <span className="font-mono text-[36px] font-medium leading-none text-[var(--accent)]">{calcCost}</span>
                        <CreditIcon size={24} />
                      </div>
                      <div className="text-[12px] text-[var(--fg-3)]">
                        {calcTierLabel} — <strong className="text-[var(--fg-2)] font-medium">{calcTierRange}</strong>
                      </div>
                      {calcTab !== 'pipeline' && (
                        <div className="flex gap-1 mt-2">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${i <= calcTierIdx ? 'bg-[var(--accent)]' : 'bg-[var(--surface-deep)]'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5">
                        <span className="text-[12px] text-[var(--fg-3)]">{t('genWith')} <Cr amount={activeBalance} size={12} iconSize={11} /></span>
                        <span className="font-mono text-[13px] text-[var(--accent)]">{gens} {calcTab === 'pipeline' ? t('pipelines') : t('gens')}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5">
                        <span className="text-[12px] text-[var(--fg-3)]">{t('balanceAfter')}</span>
                        <Cr amount={balAfter} size={13} iconSize={12} className="text-[var(--fg)]" />
                      </div>
                      {calcBreakdown && (
                        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5">
                          <span className="text-[12px] text-[var(--fg-3)]">{t('txPlusNotes')}</span>
                          <span className="flex items-center gap-1 font-mono text-[13px] text-[var(--fg)]">
                            <Cr amount={calcBreakdown.t} size={13} iconSize={12} />
                            <span className="text-[var(--fg-3)] mx-0.5">+</span>
                            <Cr amount={calcBreakdown.n} size={13} iconSize={12} />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Top up */}
            <motion.div variants={itemVariants}>
              <SectionLabel>{t('sectionTopup')}</SectionLabel>
              <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-[18px] surface noise">
                <div>
                  <div className="mb-1 text-[13px] font-medium text-[var(--fg)]">{t('creditPackages')}</div>
                  <div className="text-[12px] leading-relaxed text-[var(--fg-3)] max-w-[560px]">
                    {t('topupDesc1')} <span className="text-[var(--fg)] font-medium">{t('topupDesc2')}</span>.
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {TOPUP_PRESETS.map((p) => (
                    <button key={p.amount} onClick={() => setSelectedTopup(p.amount)}
                      className={`relative rounded-lg border py-3.5 text-center transition-all
                        ${selectedTopup === p.amount
                          ? 'border-[rgba(0,212,200,0.4)] bg-[rgba(0,212,200,0.07)]'
                          : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-hover)]'}`}>
                      {p.popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--on-accent)] whitespace-nowrap">
                          {t('popular')}
                        </span>
                      )}
                      <div className={`flex items-center justify-center gap-1.5 font-mono text-[18px] font-medium ${selectedTopup === p.amount ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>
                        {p.amount}
                        <CreditIcon size={16} color={selectedTopup === p.amount ? '#00d4c8' : 'var(--fg)'} />
                      </div>
                      <div className="text-[11px] text-[var(--fg-3)] mt-0.5">{p.label} · {p.hint}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => router.push('/topup')}
                  className="flex w-fit items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[13px] font-medium text-[var(--on-accent)] transition-opacity hover:opacity-85">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-2">
                    <path d="M12 5v14M5 12l7-7 7 7" />
                  </svg>
                  {t('topupBtn', { credits: selectedTopup })}
                </button>
              </div>
            </motion.div>

            {/* FAQ */}
            <motion.div variants={itemVariants}>
              <SectionLabel>{t('sectionFaq')}</SectionLabel>
              <div
                className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] surface"
                style={{ gap: '1px', background: 'rgba(255,255,255,0.06)' }}
              >
                {FAQ_ITEMS.map((item, i) => <FaqItem key={i} {...item} />)}
              </div>
            </motion.div>

            {/* Footer note */}
            <motion.div variants={itemVariants} className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-[18px] py-3.5">
              <svg viewBox="0 0 24 24" className="mt-px h-3.5 w-3.5 flex-shrink-0 stroke-[var(--fg-3)] fill-none stroke-[1.8]">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[12.5px] leading-relaxed text-[var(--fg-3)]">
                {t('footerNote1')} <strong className="text-[var(--fg-2)] font-medium">{t('footerNote2')}</strong> {t('footerNote3')} <strong className="text-[var(--fg)] font-medium">{t('footerNote4')}</strong>
                <br />{t('footerNote5')} <span className="text-[var(--fg-2)] font-medium">{t('topupDesc2')}</span>.
              </p>
            </motion.div>

          </motion.div>
        </main>
      </div>
    </div>
  );
}