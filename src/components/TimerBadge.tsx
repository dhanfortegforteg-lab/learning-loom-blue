import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { useTimer, elapsedSeconds } from "@/lib/timer-store";

export function TimerBadge() {
  const s = useTimer();
  const [, tick] = useState(0);
  useEffect(() => {
    if (!s.running) return;
    const i = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [s.running]);
  if (!s.running && s.elapsedBefore === 0) return null;
  const total = elapsedSeconds(s);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return (
    <Link to="/cronograma" className="hidden items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary md:inline-flex">
      <Timer className="h-3.5 w-3.5" />
      {mm}:{ss}
    </Link>
  );
}
