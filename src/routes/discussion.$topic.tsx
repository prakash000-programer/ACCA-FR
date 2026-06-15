import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Send, MessageSquare, Loader2, CornerDownRight, X, Reply } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/discussion/$topic")({ component: DiscussionPage });

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function DiscussionPage() {
  const { topic } = Route.useParams();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [contentInfo, setContentInfo] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);


  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topic);

  // Fetch comments function
  const fetchComments = async () => {
    if (!isUuid) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*, users(id, full_name, email)")
        .eq("content_id", topic)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("Error loading discussion comments:", err);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (isUuid) {
          // Fetch content info
          const { data } = await supabase
            .from("content")
            .select("title, chapter, topic")
            .eq("id", topic)
            .single();
          if (data) {
            setContentInfo(data);
          }
          await fetchComments();
        }
      } catch (err) {
        console.error("Error loading discussion page:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [topic, isUuid]);

  // Real-time Postgres changes subscription
  useEffect(() => {
    if (!isUuid) return;

    const channel = supabase
      .channel(`discussion-${topic}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `content_id=eq.${topic}` },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topic, isUuid]);

  // Handle post comment
  const handleSend = async () => {
    if (!inputText.trim() || submitting || !isUuid || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        content_id: topic,
        user_id: user.id,
        body: inputText.trim(),
        parent_id: replyTo?.id || null,
      });

      if (error) throw error;
      setInputText("");
      setReplyTo(null);
      toast.success("Comment posted successfully!");
      await fetchComments();
    } catch (err) {
      console.error("Failed to post comment:", err);
      toast.error("Could not post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };


  // Set reply target
  const handleReplyClick = (commentId: string, name: string) => {
    setReplyTo({ id: commentId, name });
    inputRef.current?.focus();
  };

  const rootComments = comments.filter((c) => !c.parent_id);
  const childReplies = comments.filter((c) => c.parent_id);

  const headingTitle = contentInfo?.title || topic.replace(/-/g, " ");

  return (
    <MobileFrame bg="bg-card">
      <TopBar 
        title="Discussion" 
        back={`/notes/${topic}`} 
        right={
          <Link 
            to="/contact"
            className="text-[11px] font-semibold text-primary bg-primary-light px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
          >
            Contact Admin
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
        <div className="mb-4">
          <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">
            Notes Topic discussion
          </p>
          <h1 className="font-display font-bold text-base text-foreground mt-0.5 leading-snug">
            {headingTitle}
          </h1>
          {contentInfo?.chapter && (
            <p className="text-[12px] text-primary font-medium mt-1">
              {contentInfo.chapter}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-[13px] text-muted-foreground mt-3">Loading discussion thread...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border p-6 bg-background/50">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary-light flex items-center justify-center mb-3">
              <MessageSquare size={22} className="text-primary" />
            </div>
            <h3 className="font-display font-semibold text-[14px] text-foreground">Be the first to speak</h3>
            <p className="text-[11px] text-muted-foreground mt-1 px-4">
              Ask a question about these notes or answer someone else's query!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rootComments.map((comment) => {
              const u = comment.users;
              const name = u?.full_name || u?.email?.split("@")[0] || "Student";
              const replies = childReplies.filter((r) => r.parent_id === comment.id);

              return (
                <div key={comment.id} className="space-y-3">
                  {/* Root Comment */}
                  <div className="rounded-2xl bg-card border border-border p-3.5 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-primary-light text-primary font-semibold text-[11px] flex items-center justify-center">
                        {name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground truncate">{name}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-foreground whitespace-pre-line">
                      {comment.body}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => handleReplyClick(comment.id, name)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        <Reply size={12} /> Reply
                      </button>
                    </div>
                  </div>

                  {/* Replies (Threaded) */}
                  {replies.length > 0 && (
                    <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                      {replies.map((reply) => {
                        const ru = reply.users;
                        const rName = ru?.full_name || ru?.email?.split("@")[0] || "Student";

                        return (
                          <div
                            key={reply.id}
                            className="rounded-xl bg-background border border-border/80 p-3 flex gap-2.5"
                          >
                            <CornerDownRight size={14} className="text-muted-foreground shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-secondary text-primary font-semibold text-[10px] flex items-center justify-center shrink-0">
                                  {rName[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-foreground truncate">
                                    {rName}
                                  </p>
                                </div>
                                <span className="text-[9px] text-muted-foreground">
                                  {formatRelativeTime(reply.created_at)}
                                </span>
                              </div>
                              <p className="mt-1.5 text-[12px] leading-relaxed text-foreground whitespace-pre-line">
                                {reply.body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply helper indicator & comment input */}
      <div className="absolute bottom-0 inset-x-0 bg-card border-t border-border z-20">
        {replyTo && (
          <div className="px-4 py-1.5 bg-primary-light flex items-center justify-between text-[11px] text-primary border-b border-primary/10">
            <span>Replying to <strong>{replyTo.name}</strong></span>
            <button onClick={() => setReplyTo(null)} className="p-0.5 rounded hover:bg-primary/10">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="px-3 py-3 flex items-center gap-2">
          <input
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Add a comment..."}
            className="flex-1 h-11 rounded-xl bg-background border border-border px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || submitting}
            className="h-11 w-11 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-40 shrink-0 hover:bg-primary/95 transition-all"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>


    </MobileFrame>
  );
}
