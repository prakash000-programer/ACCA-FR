import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { BookOpen, ListChecks, Megaphone, Loader2, BellOff, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

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

function getNotificationType(title: string, body: string): "quiz" | "note" | "ann" {
  const combined = (title + " " + body).toLowerCase();
  if (combined.includes("quiz") || combined.includes("question") || combined.includes("attempt")) return "quiz";
  if (combined.includes("note") || combined.includes("pdf") || combined.includes("chapter") || combined.includes("summary") || combined.includes("revision")) return "note";
  return "ann";
}

const iconMap = {
  note: { Icon: BookOpen, tint: "bg-primary-light text-primary" },
  quiz: { Icon: ListChecks, tint: "bg-warning-light text-warning" },
  ann: { Icon: Megaphone, tint: "bg-primary text-white" },
};

function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<string[]>([]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("sent_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);

      // Once loaded, mark all loaded notifications as read in localStorage
      if (data && data.length > 0) {
        const idsToMark = data.map((n) => n.id);
        setReadIds((prev) => {
          const updated = Array.from(new Set([...prev, ...idsToMark]));
          localStorage.setItem("read_notifications", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load read notifications from localStorage
    try {
      const stored = localStorage.getItem("read_notifications");
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error reading notifications read status:", err);
    }

    fetchNotifications();
  }, []);

  return (
    <MobileFrame>
      <TopBar 
        title="Notifications" 
        right={
          <button 
            onClick={fetchNotifications}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
            title="Refresh notifications"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-primary" : ""} />
          </button>
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 px-5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[13px] text-muted-foreground mt-3">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="px-5 pt-16 text-center">
          <div className="rounded-2xl bg-card border border-border p-6 py-10 flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-background flex items-center justify-center text-muted-foreground">
              <BellOff size={24} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[14px] text-foreground">All caught up!</h3>
              <p className="text-[11px] text-muted-foreground mt-1 px-4">
                No new notifications. We'll alert you when there are new study materials or quizzes!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-2">
          {notifications.map((n) => {
            const isUnread = !readIds.includes(n.id);
            const nType = getNotificationType(n.title || "", n.body || "");
            const { Icon, tint } = iconMap[nType];

            return (
              <div
                key={n.id}
                className={`rounded-xl p-3 flex items-start gap-3 transition-all ${
                  isUnread
                    ? "bg-primary-light border-l-4 border-primary"
                    : "bg-card border border-border"
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`font-display font-semibold text-[13px] ${isUnread ? "text-foreground" : "text-foreground/80"}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelativeTime(n.sent_at)}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-[12px] leading-snug ${isUnread ? "text-foreground/80" : "text-muted-foreground"}`}>
                    {n.body}
                  </p>
                  {n.sent_by && (
                    <p className="text-[9px] text-muted-foreground mt-1">
                      From: {n.sent_by}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MobileFrame>
  );
}
