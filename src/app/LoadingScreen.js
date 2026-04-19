export default function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="w-full flex h-screen flex-col items-center justify-center gap-6 bg-[#0c0c0e]">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 rounded-full border border-white/[0.04]" />
        <div className="h-16 w-16 rounded-full border border-transparent border-t-[#00d4c8]"
          style={{ animation: 'spin 1s linear infinite' }} />
        <div className="absolute h-1.5 w-1.5 rounded-full bg-[#00d4c8]"
          style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="text-[13px] font-medium text-[#e8e8ed]">{message}</div>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-[3px] w-[3px] rounded-full bg-[#00d4c8]"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}