'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import { useRouter } from 'next/navigation';

// ─── Pricing data ──────────────────────────────────────────────────────────────
const NOTE_TIERS = [
  { range: 'Under 25k tokens', strong: 'Under 25k', badge: 'Tier 1', badgeClass: 'green', price: 3 },
  { range: '25k – 50k tokens', strong: '25k – 50k', badge: 'Tier 2', badgeClass: 'amber', price: 6 },
  { range: '50k – 75k tokens', strong: '50k – 75k', badge: 'Tier 3', badgeClass: 'orange', price: 10 },
  { range: '75k – 100k tokens', strong: '75k – 100k', badge: 'Tier 4', badgeClass: 'red', price: 13, sub: 'Hard capped at 100k tokens' },
];

const TRANSCRIPT_TIERS = [
  { range: 'Under 1 hour', strong: 'Under 1 hour', badge: 'Tier 1', badgeClass: 'green', prem: 4, turbo: 2.5 },
  { range: '1 – 2 hours', strong: '1 – 2 hours', badge: 'Tier 2', badgeClass: 'amber', prem: 8, turbo: 5 },
  { range: '2 – 3 hours', strong: '2 – 3 hours', badge: 'Tier 3', badgeClass: 'orange', prem: 12, turbo: 7.5 },
  { range: 'Over 3 hours', strong: 'Over 3 hours', badge: 'Tier 4', badgeClass: 'red', prem: '฿ 4/hr', turbo: '฿ 2.5/hr', sub: 'Hard capped at 10 hours' },
];

const GROUP_TIERS = [
  {
    name: 'Small', members: 5, perMemberOff: '15%',
    tiers: [
      { badge: 'Tier 1', badgeClass: 'green', range: 'Under 25k tokens', price: 13 },
      { badge: 'Tier 2', badgeClass: 'amber', range: '25k – 50k tokens', price: 26 },
      { badge: 'Tier 3', badgeClass: 'orange', range: '50k – 75k tokens', price: 43 },
      { badge: 'Tier 4', badgeClass: 'red', range: '75k – 100k tokens', price: 56 },
    ],
  },
  {
    name: 'Study', members: 10, perMemberOff: '25%',
    tiers: [
      { badge: 'Tier 1', badgeClass: 'green', range: 'Under 25k tokens', price: 23 },
      { badge: 'Tier 2', badgeClass: 'amber', range: '25k – 50k tokens', price: 45 },
      { badge: 'Tier 3', badgeClass: 'orange', range: '50k – 75k tokens', price: 75 },
      { badge: 'Tier 4', badgeClass: 'red', range: '75k – 100k tokens', price: 98 },
    ],
  },
  {
    name: 'Class', members: 25, perMemberOff: '40%',
    tiers: [
      { badge: 'Tier 1', badgeClass: 'green', range: 'Under 25k tokens', price: 45 },
      { badge: 'Tier 2', badgeClass: 'amber', range: '25k – 50k tokens', price: 90 },
      { badge: 'Tier 3', badgeClass: 'orange', range: '50k – 75k tokens', price: 150 },
      { badge: 'Tier 4', badgeClass: 'red', range: '75k – 100k tokens', price: 195 },
    ],
  },
  {
    name: 'Faculty', members: 50, perMemberOff: '60%',
    tiers: [
      { badge: 'Tier 1', badgeClass: 'green', range: 'Under 25k tokens', price: 60 },
      { badge: 'Tier 2', badgeClass: 'amber', range: '25k – 50k tokens', price: 120 },
      { badge: 'Tier 3', badgeClass: 'orange', range: '50k – 75k tokens', price: 200 },
      { badge: 'Tier 4', badgeClass: 'red', range: '75k – 100k tokens', price: 260 },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'When does my balance get charged?',
    a: 'Your balance is checked and deducted at the moment you generate a note or run transcription. If your balance is too low, the generation won\'t start — you\'ll see an error asking you to top up first.',
  },
  {
    q: 'Do credits expire?',
    a: 'No. Credits never expire and carry over indefinitely.',
  },
  {
    q: 'How does group billing work?',
    a: 'Costs are split automatically across all group members. If anyone lacks sufficient funds, the generation won\'t run. The member who clicks generate gets a 50% discount on their share, subsidized by the rest of the group.',
  },
  {
    q: 'Why do note costs vary? What determines my tier?',
    a: 'Notes are charged based on total token count (input transcript + AI output combined). Longer lectures with denser content produce more tokens. A typical 2–3 hour lecture usually falls in Tier 2 (฿6).',
  },
  {
    q: 'Why is transcription priced separately from notes?',
    a: 'Transcription uses Whisper (priced by audio duration), while notes use a language model priced by token count. They run independently — if you already have a transcript, you skip transcription cost entirely.',
  },
  {
    q: 'How long does top-up approval take?',
    a: 'Usually within a few minutes after uploading the slip to our LINE bot. Your updated balance is reflected immediately after approval.',
  },
];

const TOPUP_PRESETS = [
  { amount: 50, hint: '~8 notes' },
  { amount: 100, hint: '~16 notes' },
  { amount: 200, hint: '~33 notes', popular: true },
  { amount: 500, hint: '~83 notes' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const badgeColors = {
  green: 'bg-[rgba(34,197,94,0.1)]  text-[#22c55e] border-[rgba(34,197,94,0.2)]',
  amber: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]',
  orange: 'bg-[rgba(249,115,22,0.08)] text-[#f97316] border-[rgba(249,115,22,0.2)]',
  red: 'bg-[rgba(239,68,68,0.1)]  text-[#ef4444] border-[rgba(239,68,68,0.2)]',
};

function getNoteTier(tokens) {
  if (tokens <= 25000) return { idx: 0, ...NOTE_TIERS[0] };
  if (tokens <= 50000) return { idx: 1, ...NOTE_TIERS[1] };
  if (tokens <= 75000) return { idx: 2, ...NOTE_TIERS[2] };
  return { idx: 3, ...NOTE_TIERS[3] };
}

function calcTranscriptCost(durIdx, exactHours, model) {
  if (durIdx === 3) {
    return Math.round(exactHours * (model === 'prem' ? 4 : 2.5));
  }
  return model === 'prem' ? TRANSCRIPT_TIERS[durIdx].prem : TRANSCRIPT_TIERS[durIdx].turbo;
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
    <div className="mb-2.5 text-[10px] uppercase tracking-[0.1em] text-[#6b6b7a] opacity-60 select-none">
      {children}
    </div>
  );
}

function TierRow({ t }) {
  return (
    <div
      className="grid gap-3 border-b border-white/[0.05] px-[18px] py-[9px] last:border-0 transition-colors hover:bg-white/[0.015]"
      style={{ gridTemplateColumns: '1fr auto auto', alignItems: 'center' }}
    >
      <div className="text-[12.5px] text-[#9898a8]">
        {t.strong
          ? <>{t.range.split(t.strong)[0]}<strong className="text-[#e8e8ed] font-medium">{t.strong}</strong>{t.range.split(t.strong)[1]}</>
          : t.range}
        {t.sub && <span className="block mt-0.5 text-[11px] text-[#6b6b7a]">{t.sub}</span>}
      </div>
      <span className={`rounded-full border px-[7px] py-0.5 text-[10px] uppercase tracking-[0.06em] ${badgeColors[t.badgeClass]}`}>
        {t.badge}
      </span>
      <span className="w-[75px] text-right font-mono text-[14px] font-medium text-[#00d4c8]">
        {typeof t.price === 'number' ? `฿ ${t.price}` : t.price}
      </span>
    </div>
  );
}

function TierBlock({ title, icon, headerRight, tiers }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] surface noise">
      {/* Changed to a fixed height of 52px to force both headers to match exactly */}
      <div className="flex h-[52px] items-center justify-between border-b border-white/[0.07] px-[18px]">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#e8e8ed]">
          {icon}{title}
        </div>
        {headerRight}
      </div>
      {tiers.map((t, i) => <TierRow key={i} t={t} />)}
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(v => !v)}
      className="w-full text-left bg-[#111116]"
    >
      <div className={`flex items-center justify-between gap-3 px-[18px] py-3.5 text-[13px] transition-colors ${open ? 'text-[#e8e8ed]' : 'text-[#9898a8] hover:text-[#e8e8ed]'}`}>
        <span>{q}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 flex-shrink-0 stroke-[#6b6b7a] fill-none stroke-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {/* Use max-h-96 to safely accommodate long answers */}
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-96 pb-3.5' : 'max-h-0'}`}>
        <p className="px-[18px] text-left text-[13px] leading-[1.7] text-[#6b6b7a]">{a}</p>
      </div>
    </button>
  );
}

function BalanceInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] uppercase tracking-[0.06em] text-[#6b6b7a] opacity-70">{label}</div>
      <div className="flex overflow-hidden rounded-lg border border-white/[0.07] focus-within:border-[rgba(0,212,200,0.35)] transition-colors">
        <div className="border-r border-white/[0.07] bg-[#1e1e27] px-3 py-2 text-[13px] text-[#6b6b7a] select-none">฿</div>
        <input
          type="number" value={value} min="0" max="9999"
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 bg-[#18181f] px-3 py-2 font-mono text-[14px] text-[#e8e8ed] outline-none"
        />
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Pricing() {
  const [calcTab, setCalcTab] = useState('notes');
  const [tokenSlider, setTokenSlider] = useState(20000);
  const [balanceNotes, setBalanceNotes] = useState(85);
  const [durIdx, setDurIdx] = useState(0);
  const [txModel, setTxModel] = useState('turbo');
  const [exactHours, setExactHours] = useState(4);
  const [balanceTx, setBalanceTx] = useState(85);
  const [pipeDurIdx, setPipeDurIdx] = useState(0);
  const [pipeTokens, setPipeTokens] = useState(20000);
  const [balancePipe, setBalancePipe] = useState(85);
  const [selectedTopup, setSelectedTopup] = useState(200);
  const [calcTxModel, setCalcTxModel] = useState('turbo');
  const [pipeTxModel, setPipeTxModel] = useState('turbo');
  const [pipeExactHours, setPipeExactHours] = useState(4);
  const router = useRouter();

  // ── Calc results ─────────────────────────────────────────────────────────────
  let calcCost = 0, calcTierLabel = '', calcTierRange = '', calcTierIdx = 0, calcBreakdown = null;

  if (calcTab === 'notes') {
    const tier = getNoteTier(tokenSlider);
    calcCost = tier.price; calcTierLabel = tier.badge; calcTierRange = tier.range; calcTierIdx = tier.idx;
  } else if (calcTab === 'transcript') {
    calcCost = calcTranscriptCost(durIdx, exactHours, calcTxModel);
    calcTierLabel = `Tier ${durIdx + 1}`;
    calcTierRange = durIdx === 3 ? `${exactHours} hours (฿${calcTxModel === 'prem' ? 4 : 2.5}/hr)` : TRANSCRIPT_TIERS[durIdx].range;
    calcTierIdx = durIdx;
  } else {
    const tCost = calcTranscriptCost(pipeDurIdx, pipeExactHours, pipeTxModel);
    const nTier = getNoteTier(pipeTokens);
    calcCost = tCost + nTier.price;
    calcTierLabel = 'Combined'; calcTierRange = 'Transcription + Notes';
    calcBreakdown = `฿ ${tCost} + ฿ ${nTier.price}`; calcTierIdx = -1;
  }

  const activeBalance = calcTab === 'notes' ? balanceNotes : calcTab === 'transcript' ? balanceTx : balancePipe;
  const gens = calcCost > 0 ? Math.floor(activeBalance / calcCost) : 0;
  const balAfter = Math.max(0, activeBalance - calcCost).toFixed(2);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0c0c0e] text-[#e8e8ed] font-sans text-sm">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          <motion.div
            className="flex-1 overflow-y-auto px-9 py-7 flex flex-col gap-6"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >

            {/* Header */}
            <motion.div variants={itemVariants}>
              <h1 className="font-serif text-[24px] font-normal tracking-[-0.02em] text-[#e8e8ed] mb-1">
                Pay only for what you <span className="text-[#00d4c8]">use</span>
              </h1>
              <p className="text-[13px] text-[#6b6b7a]">Credit-based — top up once, spend as you go. No subscription, no expiry.</p>
            </motion.div>

            {/* Individual tiers */}
            <motion.div variants={itemVariants}>
              <SectionLabel>Individual tiers</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <TierBlock
                  title="Inclass Notes"
                  headerRight={<span className="text-[11px] text-[#6b6b7a]">per generation</span>}
                  tiers={NOTE_TIERS}
                  icon={<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[#00d4c8] fill-none stroke-[1.8]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                />
                <TierBlock
                  title="Transcription"
                  headerRight={
                    <div className="flex rounded-md border border-white/[0.07] bg-[#0c0c0e] p-[2px]">
                      <button
                        onClick={() => setTxModel('turbo')}
                        className={`rounded px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em] font-medium transition-all ${txModel === 'turbo'
                          ? 'bg-[#18181f] text-[#00d4c8] border border-white/[0.07] shadow-sm'
                          : 'text-[#6b6b7a] hover:text-[#9898a8]'
                          }`}
                      >
                        Turbo
                      </button>
                      <button
                        onClick={() => setTxModel('prem')}
                        className={`rounded px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em] font-medium transition-all ${txModel === 'prem'
                          ? 'bg-[#18181f] text-[#00d4c8] border border-white/[0.07] shadow-sm'
                          : 'text-[#6b6b7a] hover:text-[#9898a8]'
                          }`}
                      >
                        Premium
                      </button>
                    </div>
                  }
                  tiers={TRANSCRIPT_TIERS.map(t => ({ ...t, price: txModel === 'prem' ? t.prem : t.turbo }))}
                  icon={<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[#00d4c8] fill-none stroke-[1.8]"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>}
                />
              </div>
            </motion.div>

            {/* Group plans */}
            <motion.div variants={itemVariants}>
              <SectionLabel>Group plans — Inclass Notes only</SectionLabel>
              <div className="grid grid-cols-4 gap-3">
                {GROUP_TIERS.map((group) => {
                  const t2Cost = group.tiers[1].price;
                  const genCost = (t2Cost / group.members) * 0.5;
                  const otherCost = (t2Cost / group.members);
                  return (
                    <div key={group.name} className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] flex flex-col surface noise">
                      <div className="flex items-center justify-between border-b border-white/[0.07] px-[18px] py-3.5">
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[#00d4c8] fill-none stroke-[1.8]">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span className="text-[13px] font-medium text-[#e8e8ed]">{group.name}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[11px] text-[#6b6b7a]">≤ {group.members} members</span>
                          <span className="text-[10px] text-[#22c55e]">{group.perMemberOff} off/member</span>
                        </div>
                      </div>
                      {group.tiers.map((t, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-white/[0.05] px-[18px] py-2 last:border-0 hover:bg-white/[0.015] transition-colors">
                          <span className={`rounded-full border px-[7px] py-0.5 text-[10px] uppercase tracking-[0.06em] ${badgeColors[t.badgeClass]}`}>{t.badge}</span>
                          <span className="flex-1 mx-3 text-[11.5px] text-[#6b6b7a]">{t.range}</span>
                          <span className="font-mono text-[13px] font-medium text-[#00d4c8]">฿ {t.price}</span>
                        </div>
                      ))}
                      <div className="border-t border-white/[0.05] px-[18px] py-3 bg-white/[0.01] mt-auto">
                        <div className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-[#9898a8] mb-1.5 opacity-60">T2 Split Example</div>
                        <div className="flex flex-col gap-1 text-[11px] text-[#6b6b7a]">
                          <div className="flex justify-between">
                            <span>Generator pays:</span>
                            <span className="font-mono text-[#00d4c8]">฿ {genCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Others ({group.members - 1}) pay:</span>
                            <span className="font-mono text-[#e8e8ed]">฿ {otherCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[11.5px] text-[#6b6b7a] opacity-60">
                Group generation costs are automatically split across all members' individual balances. The member who clicks generate pays 50% less to incentivize organizing.
              </p>
            </motion.div>

            {/* Calculator */}
            <motion.div variants={itemVariants}>
              <SectionLabel>Pricing calculator</SectionLabel>
              <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] surface noise">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-[18px] py-3.5">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-[#e8e8ed]">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[#00d4c8] fill-none stroke-[1.8]">
                      <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="12" y2="14" />
                    </svg>
                    Estimate your cost
                  </div>
                  {/* Tabs */}
                  <div className="flex gap-1 rounded-lg border border-white/[0.07] bg-[#0c0c0e] p-[3px]">
                    {['notes', 'transcript', 'pipeline'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setCalcTab(tab)}
                        className={`rounded-md px-3.5 py-[5px] text-[12px] transition-all duration-150
                          ${calcTab === tab
                            ? 'bg-[#18181f] text-[#e8e8ed] border border-white/[0.07]'
                            : 'text-[#6b6b7a] hover:text-[#9898a8]'
                          }`}
                      >
                        {tab === 'notes' ? 'Notes' : tab === 'transcript' ? 'Transcription' : 'Full pipeline'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 p-[18px]">
                  {/* Inputs */}
                  <div className="flex flex-col gap-4">

                    {calcTab === 'notes' && (
                      <>
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[#6b6b7a] opacity-70">Estimated token count</div>
                          <div className="text-[11px] text-[#6b6b7a] opacity-55">Typical 3-hr lecture ≈ 20k–28k tokens</div>
                          <div className="mt-1 flex flex-col gap-1.5">
                            <div className="font-mono text-[20px] font-medium text-[#e8e8ed]">
                              {tokenSlider.toLocaleString()} <span className="text-[13px] text-[#6b6b7a] font-normal">tokens</span>
                            </div>
                            {/* Fixed: was max="10000", should be 100000 to reach all tiers */}
                            <input type="range" min="1000" max="100000" step="1000" value={tokenSlider}
                              onChange={(e) => setTokenSlider(Number(e.target.value))}
                              className="w-full accent-[#00d4c8]" style={{ height: 3 }} />
                            <div className="flex justify-between text-[10px] text-[#6b6b7a] opacity-50 select-none">
                              <span>1k</span><span>25k</span><span>50k</span><span>75k</span><span>100k</span>
                            </div>
                          </div>
                        </div>
                        <BalanceInput label="Your balance" value={balanceNotes} onChange={setBalanceNotes} />
                      </>
                    )}

                    {calcTab === 'transcript' && (
                      <>
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[#6b6b7a] opacity-70">Model</div>
                          <div className="flex mt-1 gap-1">
                            {['turbo', 'prem'].map((m) => (
                              <button key={m} onClick={() => setCalcTxModel(m)}
                                className={`flex-1 rounded-lg border py-[7px] text-center text-[12px] uppercase tracking-[0.05em] font-medium transition-all
                                  ${calcTxModel === m
                                    ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[#00d4c8]'
                                    : 'border-white/[0.07] bg-[#18181f] text-[#6b6b7a] hover:border-white/[0.14] hover:text-[#9898a8]'}`}>
                                {m === 'prem' ? 'Premium' : 'Turbo'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[#6b6b7a] opacity-70">Recording duration</div>
                          <div className="flex mt-1 gap-1">
                            {['Under 1hr', '1 – 2hr', '2 – 3hr', '3hr+'].map((label, i) => (
                              <button key={i} onClick={() => setDurIdx(i)}
                                className={`flex-1 rounded-lg border py-[7px] text-center text-[12px] transition-all
                                  ${durIdx === i
                                    ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[#00d4c8]'
                                    : 'border-white/[0.07] bg-[#18181f] text-[#6b6b7a] hover:border-white/[0.14] hover:text-[#9898a8]'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {durIdx === 3 && (
                          <div className="flex flex-col gap-1.5">
                            <div className="text-[11px] uppercase tracking-[0.06em] text-[#6b6b7a] opacity-70">Exact duration (hours)</div>
                            <div className="flex overflow-hidden rounded-lg border border-white/[0.07]">
                              <div className="border-r border-white/[0.07] bg-[#1e1e27] px-3 py-2 text-[12px] text-[#6b6b7a] select-none">hrs</div>
                              <input type="number" value={exactHours} min="3" max="12" step="0.5"
                                onChange={(e) => setExactHours(Number(e.target.value))}
                                className="flex-1 bg-[#18181f] px-3 py-2 font-mono text-[14px] text-[#e8e8ed] outline-none" />
                            </div>
                          </div>
                        )}

                        <BalanceInput label="Your balance" value={balanceTx} onChange={setBalanceTx} />
                      </>
                    )}

                    {calcTab === 'pipeline' && (
                      <>
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[#6b6b7a] opacity-70">Transcription Model</div>
                          <div className="flex mt-1 gap-1">
                            {['turbo', 'prem'].map((m) => (
                              <button key={m} onClick={() => setPipeTxModel(m)}
                                className={`flex-1 rounded-lg border py-[7px] text-center text-[12px] uppercase tracking-[0.05em] font-medium transition-all
                                  ${pipeTxModel === m
                                    ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[#00d4c8]'
                                    : 'border-white/[0.07] bg-[#18181f] text-[#6b6b7a] hover:border-white/[0.14] hover:text-[#9898a8]'}`}>
                                {m === 'prem' ? 'Premium' : 'Turbo'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[#6b6b7a] opacity-70">Recording duration</div>
                          <div className="flex mt-1 gap-1">
                            {['Under 1hr', '1 – 2hr', '2 – 3hr', '3hr+'].map((label, i) => (
                              <button key={i} onClick={() => setPipeDurIdx(i)}
                                className={`flex-1 rounded-lg border py-[7px] text-center text-[12px] transition-all
                                  ${pipeDurIdx === i
                                    ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[#00d4c8]'
                                    : 'border-white/[0.07] bg-[#18181f] text-[#6b6b7a] hover:border-white/[0.14] hover:text-[#9898a8]'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {pipeDurIdx === 3 && (
                          <div className="flex flex-col gap-1.5">
                            <div className="text-[11px] uppercase tracking-[0.06em] text-[#6b6b7a] opacity-70">Exact duration (hours)</div>
                            <div className="flex overflow-hidden rounded-lg border border-white/[0.07]">
                              <div className="border-r border-white/[0.07] bg-[#1e1e27] px-3 py-2 text-[12px] text-[#6b6b7a] select-none">hrs</div>
                              <input type="number" value={pipeExactHours} min="3" max="12" step="0.5"
                                onChange={(e) => setPipeExactHours(Number(e.target.value))}
                                className="flex-1 bg-[#18181f] px-3 py-2 font-mono text-[14px] text-[#e8e8ed] outline-none" />
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[#6b6b7a] opacity-70">Expected note tokens</div>
                          <div className="flex flex-col gap-1.5 mt-1">
                            <div className="font-mono text-[20px] font-medium text-[#e8e8ed]">
                              {pipeTokens.toLocaleString()} <span className="text-[13px] text-[#6b6b7a] font-normal">tokens</span>
                            </div>
                            <input type="range" min="1000" max="100000" step="1000" value={pipeTokens}
                              onChange={(e) => setPipeTokens(Number(e.target.value))}
                              className="w-full accent-[#00d4c8]" style={{ height: 3 }} />
                            <div className="flex justify-between text-[10px] text-[#6b6b7a] opacity-50 select-none">
                              <span>1k</span><span>25k</span><span>50k</span><span>75k</span><span>100k</span>
                            </div>
                          </div>
                        </div>
                        <BalanceInput label="Your balance" value={balancePipe} onChange={setBalancePipe} />
                      </>
                    )}
                  </div>

                  {/* Result panel */}
                  <div className="flex flex-col gap-3 border-l border-white/[0.07] pl-6">
                    <div className="flex flex-col gap-1 rounded-xl border border-white/[0.07] bg-[#18181f] px-4 py-4 surface-teal">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-[#6b6b7a] opacity-60">Cost per generation</div>
                      <div className="font-mono text-[36px] font-medium leading-none text-[#00d4c8] my-1.5">฿ {calcCost}</div>
                      <div className="text-[12px] text-[#6b6b7a]">
                        {calcTierLabel} — <strong className="text-[#9898a8] font-medium">{calcTierRange}</strong>
                      </div>
                      {calcTab !== 'pipeline' && (
                        <div className="flex gap-1 mt-2">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className={`h-[3px] flex-1 rounded-full transition-colors duration-300
                              ${i <= calcTierIdx ? 'bg-[#00d4c8]' : 'bg-[#1e1e27]'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-2.5">
                        <span className="text-[12px] text-[#6b6b7a]">Generations with ฿{activeBalance}</span>
                        <span className="font-mono text-[13px] text-[#00d4c8]">{gens} {calcTab === 'pipeline' ? 'pipelines' : 'gens'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-2.5">
                        <span className="text-[12px] text-[#6b6b7a]">Balance after this</span>
                        <span className="font-mono text-[13px] text-[#e8e8ed]">฿ {balAfter}</span>
                      </div>
                      {calcBreakdown && (
                        <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-2.5">
                          <span className="text-[12px] text-[#6b6b7a]">Transcript + Notes</span>
                          <span className="font-mono text-[13px] text-[#e8e8ed]">{calcBreakdown}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Top up */}
            <motion.div variants={itemVariants}>
              <SectionLabel>Top up your balance</SectionLabel>
              <div className="flex flex-col gap-4 rounded-xl border border-white/[0.07] bg-[#111116] p-[18px] surface noise">
                <div>
                  <div className="mb-1 text-[13px] font-medium text-[#e8e8ed]">PromptPay transfer</div>
                  <div className="text-[12px] leading-relaxed text-[#6b6b7a] max-w-[560px]">
                    Send to the PromptPay ID shown after selecting an amount. Submit the slip — credits land after approval (usually within a few hours).
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {TOPUP_PRESETS.map((p) => (
                    <button key={p.amount} onClick={() => setSelectedTopup(p.amount)}
                      className={`relative rounded-lg border py-3.5 text-center transition-all
                        ${selectedTopup === p.amount
                          ? 'border-[rgba(0,212,200,0.4)] bg-[rgba(0,212,200,0.07)]'
                          : 'border-white/[0.07] bg-[#18181f] hover:border-white/[0.14]'}`}>
                      {p.popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#00d4c8] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#0c0c0e] whitespace-nowrap">
                          Popular
                        </span>
                      )}
                      <div className={`font-mono text-[18px] font-medium ${selectedTopup === p.amount ? 'text-[#00d4c8]' : 'text-[#e8e8ed]'}`}>
                        ฿ {p.amount}
                      </div>
                      <div className="text-[11px] text-[#6b6b7a]">{p.hint}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => router.push('/topup')} className="flex w-fit items-center gap-2 rounded-lg bg-[#00d4c8] px-4 py-2.5 text-[13px] font-medium text-[#0c0c0e] transition-opacity hover:opacity-85">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-2">
                    <path d="M12 5v14M5 12l7-7 7 7" />
                  </svg>
                  Request top-up for ฿ {selectedTopup}
                </button>
              </div>
            </motion.div>

            {/* FAQ */}
            <motion.div variants={itemVariants}>
              <SectionLabel>FAQ</SectionLabel>
              <div
                className="flex flex-col overflow-hidden rounded-xl border border-white/[0.07] surface"
                style={{ gap: '1px', background: 'rgba(255,255,255,0.06)' }}
              >
                {FAQ_ITEMS.map((item, i) => <FaqItem key={i} {...item} />)}
              </div>
            </motion.div>

            {/* Footer note */}
            <motion.div variants={itemVariants} className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-[#111116] px-[18px] py-3.5">
              <svg viewBox="0 0 24 24" className="mt-px h-3.5 w-3.5 flex-shrink-0 stroke-[#6b6b7a] fill-none stroke-[1.8]">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[12.5px] leading-relaxed text-[#6b6b7a]">
                Costs are charged from your balance at generation time. A <strong className="text-[#9898a8] font-medium">balance check runs before every generation</strong> — if your balance is insufficient, the request will not proceed.
                Token counts include both input and output. Top up via PromptPay — amounts are credited after admin approval.
              </p>
            </motion.div>

          </motion.div>
        </main>
      </div>
    </div>
  );
}