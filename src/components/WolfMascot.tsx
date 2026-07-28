// Estilizado no espírito do lobo azul da referência
export function WolfMascot({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Mascote Urstudy">
      <defs>
        <linearGradient id="wolfBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.55 0.24 260)" />
          <stop offset="1" stopColor="oklch(0.75 0.18 240)" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="oklch(0.18 0.05 265)" />
      {/* head silhouette */}
      <path d="M22,58 C22,38 34,22 52,22 C60,22 66,26 70,32 L78,26 L74,38 C78,44 80,52 78,60 C74,74 60,84 46,82 C32,80 22,72 22,58 Z"
        fill="url(#wolfBlue)" />
      {/* ear inner */}
      <path d="M62,26 L72,30 L66,36 Z" fill="oklch(0.98 0.01 250)" opacity="0.9" />
      {/* snout */}
      <path d="M22,58 C22,66 30,74 42,78 C36,66 34,58 36,50 C30,50 24,54 22,58 Z" fill="oklch(0.98 0.01 250)" />
      {/* eye */}
      <path d="M46,44 L52,46 L48,50 L44,48 Z" fill="oklch(0.15 0.05 265)" />
      {/* nose */}
      <circle cx="26" cy="60" r="2.5" fill="oklch(0.15 0.05 265)" />
    </svg>
  );
}
