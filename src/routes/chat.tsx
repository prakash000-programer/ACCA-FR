import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { Bot, Send, Sparkles, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      from: (search.from as string) || undefined,
    };
  },
  component: ChatPage,
});

type Msg = { role: "user" | "ai"; text: string };

const seed: Msg[] = [
  { role: "ai", text: "Hi Prakash! I'm your ACCA FR tutor. Ask me anything about IFRS, IAS, or worked examples." },
  { role: "user", text: "Explain IAS 16 in simple terms." },
  { role: "ai", text: "IAS 16 governs how we recognise, measure and depreciate property, plant and equipment. You capitalise the cost when it's probable future benefits will flow and the cost is reliable. Then depreciate over useful life." },
];

const chips = ["Explain IAS 16", "What is deferred tax?", "IFRS 15 vs IFRS 16", "Lease accounting example"];

function ChatPage() {
  const { from } = Route.useSearch();
  const [msgs, setMsgs] = useState<Msg[]>(seed);
  const [text, setText] = useState("");

  function send(t: string) {
    if (!t.trim()) return;
    setMsgs((m) => [...m, { role: "user", text: t }, { role: "ai", text: "Great question — let me walk you through it step by step..." }]);
    setText("");
  }

  return (
    <MobileFrame withTabs bg="bg-card">
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        {from && (
          <Link
            to={from as any}
            className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-foreground mr-0.5"
            title="Return to PDF"
          >
            <ChevronLeft size={20} />
          </Link>
        )}
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white">
          <Bot size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-semibold text-[15px]">ACCA AI Tutor</h1>
          <p className="text-[11px] text-success flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online · trained on FR syllabus
          </p>
        </div>
        <Sparkles size={18} className="text-yellow" />
      </header>

      <div className="px-4 py-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-white rounded-2xl rounded-br-md"
                  : "bg-background text-foreground rounded-2xl rounded-bl-md"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-card border-t border-border px-3 pt-2.5 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => send(c)}
              className="shrink-0 h-8 px-3 rounded-full bg-primary-light text-primary text-[11px] font-medium"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(text)}
            placeholder="Ask anything about FR..."
            className="flex-1 h-11 rounded-xl bg-background border border-border px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={() => send(text)}
            className="h-11 w-11 rounded-xl bg-primary text-white flex items-center justify-center"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </MobileFrame>
  );
}
