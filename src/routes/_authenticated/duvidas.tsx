import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateMaterial } from "@/lib/ai.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Send } from "lucide-react";
import { WolfMascot } from "@/components/WolfMascot";

export const Route = createFileRoute("/_authenticated/duvidas")({
  validateSearch: (s: Record<string, unknown>) => ({ q: (s.q as string) || "" }),
  head: () => ({ meta: [{ title: "Dúvidas — Urstudy" }, { name: "description", content: "Tire dúvidas com o tutor de IA." }] }),
  component: DuvidasPage,
});

function DuvidasPage() {
  const { q } = Route.useSearch();
  const gen = useServerFn(generateMaterial);
  const [question, setQuestion] = useState(q);
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<{ role: string; text: string }[]>([]);

  const ask = async () => {
    if (!question.trim()) return;
    const my = question;
    setQuestion("");
    setChat((c) => [...c, { role: "user", text: my }]);
    setLoading(true);
    try {
      const res = await gen({ data: { kind: "duvida", subject: my } });
      setChat((c) => [...c, { role: "wolf", text: res.content.answer || res.content.text }]);
    } catch (e: any) {
      setChat((c) => [...c, { role: "wolf", text: "Ops, algo deu errado: " + e.message }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><HelpCircle className="h-7 w-7 text-primary" /> Tirar Dúvidas</h1>
      <Card className="min-h-[400px] space-y-3 p-4">
        {chat.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
            <WolfMascot className="mb-3 h-14 w-14" />
            Manda sua dúvida — respondo em segundos!
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "wolf" && <WolfMascot className="h-8 w-8 shrink-0" />}
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-muted-foreground">Pensando...</div>}
      </Card>
      <Card className="flex gap-2 p-3">
        <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} placeholder="Digite sua dúvida..." onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} />
        <Button onClick={ask} disabled={loading}><Send className="h-4 w-4" /></Button>
      </Card>
    </div>
  );
}
