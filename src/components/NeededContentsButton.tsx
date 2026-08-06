import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { generateNeededContents } from "@/lib/related.functions";
import { Button } from "@/components/ui/button";
import { Network } from "lucide-react";
import { toast } from "sonner";

export function NeededContentsButton({
  topic,
  subject,
  className,
}: {
  topic?: string | null;
  subject?: string | null;
  className?: string;
}) {
  const navigate = useNavigate();
  const gen = useServerFn(generateNeededContents);
  const [busy, setBusy] = useState(false);

  if (!topic?.trim()) return null;

  const run = async () => {
    setBusy(true);
    try {
      await gen({ data: { topic: topic.trim(), ...(subject ? { subject: subject.trim() } : {}) } });
      toast.success("Conteúdos necessários prontos!");
      navigate({ to: "/necessarios" });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao montar os conteúdos necessários");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={run}
      disabled={busy}
      className={`gap-2 border-primary/50 bg-primary/5 text-primary hover:bg-primary/15 ${className ?? ""}`}
    >
      <Network className="h-4 w-4" />
      {busy ? "Mapeando pré-requisitos..." : "Conteúdos necessários"}
    </Button>
  );
}
