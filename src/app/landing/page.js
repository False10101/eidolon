'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion } from 'framer-motion';
import CreditIcon from '@/app/CreditIcon';

const SLIDES = [
    {
        tag: 'Exam Note',
        style: 'exam',
        tagColor: '#f97316',
        tagBg: 'rgba(249,115,22,0.12)',
        tagBorder: 'rgba(249,115,22,0.3)',
        tagDesc: 'Every detail. Every callout.',
        title: 'CQL Design and Security Requirements in Software Development',
        sections: [
            {
                heading: 'Design Fraud versus Bugs',
                body: 'The lecturer distinguishes between two categories of defects: a Bug is a malfunction or mistake in the code — a technical failure. A Design Fraud is a flaw originating from bad design rather than technology.',
                callout: '💡 Lecturer: "The shift-left paradigm emphasizes correcting flaws as early as possible. Any mistake in the SDLC becomes significantly more expensive to fix as the project progresses."',
            },
        ],
        meta: 'Captures every callout, example & lecturer note',
    },
    {
        tag: 'Standard',
        style: 'standard',
        tagColor: '#00d4c8',
        tagBg: 'rgba(0,212,200,0.1)',
        tagBorder: 'rgba(0,212,200,0.25)',
        tagDesc: 'Core concepts. Nothing extra.',
        title: 'CQL Design and Threat Modeling',
        sections: [
            {
                heading: 'CQL Design Recap — Position in SDLC',
                body: 'CQL Design is the second process in the Software Development Life Cycle (SDLC). This lecture focuses specifically on security requirements during the design process, centering on bottom-up or ground-up software — systems built from scratch.',
            },
            {
                heading: 'Fraud vs. Bugs',
                body: 'Fraud occurs due to bad design — not a fault of technology itself. Bugs are malfunctions or mistakes in the code. The shift-left paradigm emphasizes correcting faults as early as possible in the SDLC to limit costs.',
                truncated: true,
            },
        ],
        meta: 'Balanced · key points, clean structure',
    },
    {
        tag: 'Textbook',
        style: 'textbook',
        tagColor: '#a78bfa',
        tagBg: 'rgba(167,139,250,0.1)',
        tagBorder: 'rgba(167,139,250,0.25)',
        tagDesc: 'Academic prose. Deep reading.',
        title: 'Security Requirements in CQL Design',
        sections: [
            {
                heading: 'Introduction: The Software Development Lifecycle and Security',
                body: 'The software development lifecycle (SDLC) consists of multiple distinct phases, each playing a critical role in the overall success of a software project. Among these phases, design holds particular significance because it is during this stage that fundamental decisions are made about how a system will be structured, how data will flow, and how security will be integrated.',
            },
            {
                heading: 'Understanding Defects: Design Fraud Versus Security Bugs',
                body: 'A fundamental distinction that must be understood clearly is the difference between design fraud and security bugs. A bug is a malfunction or mistake in the code — arising from oversight or human error. Design fraud occurs not because of a failure in technology, but because of a failure based on the design itself.',
                truncated: true,
            },
        ],
        meta: 'Most detailed · structured like a textbook chapter',
    },
];

function NoteCard({ slide, onSeeExample, maxH }) {
    return (
        <div style={{
            background: '#111116',
            border: `1px solid ${slide.tagBorder}`,
            borderRadius: 14,
            width: 370,
            maxHeight: maxH,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* Badge — fixed top */}
            <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{
                        background: slide.tagBg, border: `1px solid ${slide.tagBorder}`,
                        color: slide.tagColor, fontSize: 11, fontWeight: 600,
                        padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em', flexShrink: 0,
                    }}>
                        {slide.tag}
                    </div>
                    <div style={{ fontSize: 11.5, color: slide.tagColor, opacity: 0.75 }}>{slide.tagDesc}</div>
                </div>
                <div style={{ height: 1, background: slide.tagBorder, opacity: 0.4, marginBottom: 12 }} />
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 14.5, color: '#e8e8ed', marginBottom: 12, lineHeight: 1.35 }}>
                    {slide.title}
                </div>
            </div>

            {/* Sections — scrolls internally, never overflows card */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', minHeight: 0, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {slide.sections.map((s, i) => (
                        <div key={i}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#e8e8ed', marginBottom: 4 }}>{s.heading}</div>
                            <p style={{ fontSize: 11.5, color: '#9a9aaa', lineHeight: 1.75, margin: 0 }}>
                                {s.body}
                                {s.truncated && <span style={{ color: slide.tagColor, opacity: 0.6 }}> ···</span>}
                            </p>
                            {s.callout && (
                                <div style={{
                                    marginTop: 8, background: slide.tagBg,
                                    borderLeft: `2px solid ${slide.tagBorder}`,
                                    padding: '7px 10px', borderRadius: '0 5px 5px 0',
                                    fontSize: 11, color: '#7a7a8a', lineHeight: 1.65,
                                }}>
                                    {s.callout}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
                    background: 'linear-gradient(transparent, #111116)',
                    pointerEvents: 'none',
                }} />
            </div>

            {/* Footer — always pinned to bottom of card */}
            <div style={{ flexShrink: 0, padding: '10px 20px 14px' }}>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 10 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10.5, color: '#5a5a6a' }}>{slide.meta}</span>
                    <button onClick={onSeeExample} style={{
                        background: slide.tagBg, border: `1px solid ${slide.tagBorder}`,
                        color: slide.tagColor, fontSize: 11, padding: '3px 10px',
                        borderRadius: 6, cursor: 'pointer', fontWeight: 500,
                    }}>
                        See full example →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Landing() {
    const router = useRouter();
    const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
    const [cur, setCur] = useState(2);
    const n = SLIDES.length;

    useEffect(() => {
        if (!isLoading && isAuthenticated) router.replace('/home');
    }, [isAuthenticated, isLoading, router]);

    const prev = useCallback(() => setCur(c => (c - 1 + n) % n), [n]);
    const next = useCallback(() => setCur(c => (c + 1) % n), [n]);

    useEffect(() => {
        const h = (e) => {
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [prev, next]);

    const handleSignIn = () => {
        loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } });
    };

    const prevIdx = (cur - 1 + n) % n;
    const nextIdx = (cur + 1) % n;

    return (
        <div style={{
            background: '#0c0c0e', color: '#e8e8ed', height: '100vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}>

            <nav style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 40px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
            }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#00d4c8', letterSpacing: '-0.02em' }}>Eidolon</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => router.push('/landing/pricing')}
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#9a9aaa', padding: '5px 13px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                        Pricing
                    </button>
                    <button onClick={handleSignIn}
                        style={{ background: '#00d4c8', border: 'none', color: '#0c0c0e', padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Sign in
                    </button>
                </div>
            </nav>

            <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ textAlign: 'center', padding: '20px 40px 16px', flexShrink: 0 }}
            >
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 34, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 8 }}>
                    Your lecture. Structured by{' '}<span style={{ color: '#00d4c8' }}>Eidolon.</span>
                </h1>
                <p style={{ color: '#7a7a8a', fontSize: 13, lineHeight: 1.6, maxWidth: 380, margin: '0 auto 14px' }}>
                    Upload your recording or transcript — get exam-ready notes in seconds.
                </p>
                <button onClick={handleSignIn}
                    style={{ padding: '8px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: '#00d4c8', border: 'none', color: '#0c0c0e', cursor: 'pointer' }}>
                    Get started
                </button>
            </motion.div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5a5a6a', textAlign: 'center', marginBottom: 10, flexShrink: 0 }}>
                    Real output — real lecture
                </div>

                {/* Stage — overflow hidden keeps cards inside, padding keeps borders visible */}
                <div style={{
                    position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 0, overflow: 'hidden', padding: '10px 0',
                }}>
                    <div onClick={prev} style={{ position: 'absolute', transform: 'translateX(-410px) scale(0.8)', opacity: 0.35, cursor: 'pointer', zIndex: 1, display: 'flex', alignItems: 'center', height: '100%' }}>
                        <NoteCard slide={SLIDES[prevIdx]} onSeeExample={() => { }} maxH="100%" />
                    </div>

                    <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', height: '100%' }}>
                        <motion.div key={cur} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, ease: 'easeOut' }} style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <NoteCard slide={SLIDES[cur]} onSeeExample={() => router.push(`/note/sample?style=${SLIDES[cur].style}`)} maxH="100%" />
                        </motion.div>
                    </div>

                    <div onClick={next} style={{ position: 'absolute', transform: 'translateX(410px) scale(0.8)', opacity: 0.35, cursor: 'pointer', zIndex: 1, display: 'flex', alignItems: 'center', height: '100%' }}>
                        <NoteCard slide={SLIDES[nextIdx]} onSeeExample={() => { }} maxH="100%" />
                    </div>

                    <button onClick={prev} style={{
                        position: 'absolute', left: 'calc(50% - 238px)', top: '50%', transform: 'translateY(-50%)',
                        zIndex: 10, background: '#1e1e27', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#e8e8ed', width: 32, height: 32, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17,
                    }}>&#8249;</button>

                    <button onClick={next} style={{
                        position: 'absolute', right: 'calc(50% - 238px)', top: '50%', transform: 'translateY(-50%)',
                        zIndex: 10, background: '#1e1e27', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#e8e8ed', width: 32, height: 32, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17,
                    }}>&#8250;</button>
                </div>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '8px 0 10px', flexShrink: 0 }}>
                    {SLIDES.map((_, i) => (
                        <button key={i} onClick={() => setCur(i)} style={{
                            width: i === cur ? 18 : 6, height: 6,
                            borderRadius: i === cur ? 3 : '50%',
                            background: i === cur ? SLIDES[cur].tagColor : 'rgba(255,255,255,0.15)',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0,
                        }} />
                    ))}
                </div>
            </div>

            <div style={{ flexShrink: 0, display: 'flex', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0f0f12' }}>
                {[{ label: 'No subscription', sub: 'ever' }, { label: 'Pay per note', sub: <span style={{display: 'flex', alignItems: 'center', gap: 3}}>from 9 <CreditIcon size={10} color="#5a5a6a" /></span> }, { label: 'Credits never expire', sub: 'top up once' }].map((item, idx) => (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 0', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: 13, color: '#b4b4c2', fontWeight: 500, marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: '#5a5a6a' }}>{item.sub}</div>
                    </div>
                ))}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 0' }}>
                    <button onClick={() => router.push('/landing/pricing')}
                        style={{ background: 'none', border: 'none', color: '#00d4c8', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: 2 }}>
                        See pricing →
                    </button>
                    <div style={{ fontSize: 11, color: '#5a5a6a' }}>simple tiers</div>
                </div>
            </div>
        </div>
    );
}