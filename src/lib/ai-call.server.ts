const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export async function callAI(messages: any[], schema?: any): Promise<any> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const body: any = { model: MODEL, messages };
  if (schema) {
    body.tools = [
      { type: "function", function: { name: "output", description: "Return the requested content", parameters: schema } },
    ];
    body.tool_choice = { type: "function", function: { name: "output" } };
  }
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Muitas requisições — tente novamente em instantes");
    if (res.status === 402) throw new Error("Créditos de IA esgotados — adicione créditos na sua workspace");
    throw new Error(`Falha na IA: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  if (msg?.tool_calls?.[0]) return JSON.parse(msg.tool_calls[0].function.arguments);
  return { text: msg?.content ?? "" };
}
