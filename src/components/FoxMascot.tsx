import neutral from "@/assets/fox-neutral.png.asset.json";
import happy from "@/assets/fox-happy.png.asset.json";
import tired from "@/assets/fox-tired.png.asset.json";
import dead from "@/assets/fox-dead.png.asset.json";

export type FoxMood = "neutral" | "happy" | "tired" | "dead";

const SRC: Record<FoxMood, string> = {
  neutral: neutral.url,
  happy: happy.url,
  tired: tired.url,
  dead: dead.url,
};

const LABEL: Record<FoxMood, string> = {
  neutral: "Raposinha Foxstudy neutra",
  happy: "Raposinha Foxstudy feliz",
  tired: "Raposinha Foxstudy cansada",
  dead: "Raposinha Foxstudy exausta",
};

export function FoxMascot({
  className = "h-8 w-8",
  mood = "neutral",
}: {
  className?: string;
  mood?: FoxMood;
}) {
  return (
    <img
      src={SRC[mood]}
      alt={LABEL[mood]}
      className={`${className} object-contain drop-shadow-[0_0_22px_oklch(0.75_0.24_255/0.65)] transition-all duration-500`}
      loading="lazy"
    />
  );
}

