// Usage: <CreditIcon size={16} /> or <CreditIcon size={24} color="#00d4c8" />

export default function CreditIcon({ size = 16, color = '#00d4c8', className = '' }) {
    const s = size / 68; // scale factor from viewBox 68x68

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 68 68"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ flexShrink: 0, display: 'inline-block', verticalAlign: '-0.175em' }}
            aria-hidden="true"
        >
            {/* dashed outer circle */}
            <circle cx="34" cy="34" r="30" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" />

            {/* diamond */}
            <polygon points="34,14 54,34 34,54 14,34" stroke={color} strokeWidth="2" />

            {/* circuit lines N/S/E/W from circle to diamond */}
            <line x1="34" y1="4"  x2="34" y2="14" stroke={color} strokeWidth="1.5" />
            <line x1="34" y1="64" x2="34" y2="54" stroke={color} strokeWidth="1.5" />
            <line x1="4"  y1="34" x2="14" y2="34" stroke={color} strokeWidth="1.5" />
            <line x1="64" y1="34" x2="54" y2="34" stroke={color} strokeWidth="1.5" />

            {/* corner dots on circle */}
            <circle cx="34" cy="4"  r="2.5" fill={color} />
            <circle cx="34" cy="64" r="2.5" fill={color} />
            <circle cx="4"  cy="34" r="2.5" fill={color} />
            <circle cx="64" cy="34" r="2.5" fill={color} />

            {/* inner ring */}
            <circle cx="34" cy="34" r="7" stroke={color} strokeWidth="1" />

            {/* center dot */}
            <circle cx="34" cy="34" r="3.5" fill={color} />
        </svg>
    );
}