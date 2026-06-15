import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Send, Loader2, MessageSquare, Headphones } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({ component: ContactAdminPage });

interface Message {
  id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

function ContactAdminPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchMessages();

    // Set up real-time listener for new messages matching this user ID
    const channel = supabase
      .channel(`user-support-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || sending) return;

    const currentText = text.trim();
    setText("");
    setSending(true);

    try {
      const { error } = await supabase.from("support_messages").insert({
        user_id: user.id,
        message: currentText,
        is_admin_reply: false,
      });

      if (error) throw error;
      await fetchMessages();
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message. Please try again.");
      setText(currentText); // Restore text on failure
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  };

  return (
    <MobileFrame bg="bg-card">
      <TopBar title="Contact Admin" />

      {/* Main Chat Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24 flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-primary mb-2" />
            <p className="text-xs">Loading message history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mb-4">
              <Headphones size={24} />
            </div>
            <h3 className="font-display font-semibold text-[15px] text-foreground">Have a question?</h3>
            <p className="text-[11.5px] text-muted-foreground mt-1.5 max-w-[240px] leading-relaxed">
              Ask about syllabus notes, billing issues, quiz formats, or device lock reset requests here.
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-3">
            <div className="text-center py-1.5">
              <span className="text-[10px] bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium uppercase tracking-wider">
                Support Thread Started
              </span>
            </div>
            {messages.map((m) => {
              const isAdmin = m.is_admin_reply;
              return (
                <div key={m.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                  <div className={`flex flex-col max-w-[78%] ${isAdmin ? "items-start" : "items-end"}`}>
                    <div
                      className={`px-3.5 py-2.5 text-[12.5px] leading-relaxed rounded-2xl shadow-sm ${
                        isAdmin
                          ? "bg-muted text-foreground rounded-tl-sm border border-border"
                          : "bg-primary text-white rounded-tr-sm"
                      }`}
                    >
                      {m.message}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1 px-1">
                      {isAdmin ? "Admin" : "You"} · {formatTime(m.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleSend}
        className="absolute bottom-0 inset-x-0 bg-card border-t border-border p-3 flex items-center gap-2 z-20"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question or request device reset..."
          className="flex-1 h-11 rounded-xl bg-background border border-border px-4 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
          disabled={loading || sending}
        />
        <button
          type="submit"
          disabled={!text.trim() || loading || sending}
          className="h-11 w-11 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary/95 transition-all shrink-0"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </MobileFrame>
  );
}
