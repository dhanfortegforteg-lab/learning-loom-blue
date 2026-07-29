import wolfImg from "@/assets/wolf-mascot.png";

export function WolfMascot({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src={wolfImg}
      alt="Mascote Urstudy"
      className={`${className} object-contain drop-shadow-[0_0_18px_oklch(0.75_0.24_255/0.55)]`}
      loading="lazy"
      width={1024}
      height={1024}
    />
  );
}
