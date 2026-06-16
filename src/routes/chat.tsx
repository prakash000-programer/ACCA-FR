import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { Bot, Send, Sparkles, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      from: (search.from as string) || undefined,
    };
  },
  component: ChatPage,
});

type Msg = { role: "user" | "ai"; text: string };

const chips = ["Explain IAS 16", "What is deferred tax?", "IFRS 15 vs IFRS 16", "Lease accounting example"];

function ChatPage() {
  const { from } = Route.useSearch();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch student profile info
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (!error && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error("Error fetching profile for chat welcome:", err);
      }
    };
    fetchProfile();
  }, [user]);

  const studentName = profile?.full_name || user?.email?.split("@")[0] || "Student";

  // Set the dynamic welcome message once studentName is available
  useEffect(() => {
    if (msgs.length === 0 && studentName) {
      setMsgs([
        {
          role: "ai",
          text: `Hi ${studentName}! I'm your ACCA FR tutor. Ask me anything about IFRS, IAS, or worked examples.`,
        },
      ]);
    }
  }, [studentName, msgs.length]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  function send(t: string) {
    if (!t.trim()) return;
    setMsgs((m) => [
      ...m,
      { role: "user", text: t },
      { role: "ai", text: "Great question — let me walk you through it step by step..." },
    ]);
    setText("");
  }

  return (
    <MobileFrame withTabs bg="bg-card" scrollable={false}>
      <div className="flex flex-col h-full animate-fade-in">
        {/* Header */}
        <header className="shrink-0 bg-card border-b border-border px-4 py-3 flex items-center gap-3 z-10">
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

        {/* Message Feed - scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar bg-background/25">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div
                className={`max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-white rounded-2xl rounded-br-md shadow-sm"
                    : "bg-card border border-border text-foreground rounded-2xl rounded-bl-md shadow-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area - fixed at bottom */}
        <div className="shrink-0 bg-card border-t border-border px-3 pt-2.5 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                className="shrink-0 h-8 px-3 rounded-full bg-primary-light text-primary text-[11px] font-medium hover:bg-primary/20 active:scale-95 transition-all"
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
              className="flex-1 h-11 rounded-xl bg-background border border-border px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
            />
            <button
              onClick={() => send(text)}
              className="h-11 w-11 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/95 active:scale-95 transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
