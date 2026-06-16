import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { Bell, Flame, BookOpen, ListChecks, Play, Megaphone, CheckSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

function calculateStreak(attempts: { attempted_at: string }[]): number {
  if (!attempts || attempts.length === 0) return 0;
  const attemptDates = attempts.map((a) => new Date(a.attempted_at).toDateString());
  const uniqueDates = Array.from(new Set(attemptDates)).map((d) => new Date(d));
  uniqueDates.sort((a, b) => b.getTime() - a.getTime());

  if (uniqueDates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mostRecent = uniqueDates[0];
  mostRecent.setHours(0, 0, 0, 0);

  if (mostRecent.getTime() === today.getTime() || mostRecent.getTime() === yesterday.getTime()) {
    let count = 1;
    let ref = mostRecent;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = uniqueDates[i];
      prev.setHours(0, 0, 0, 0);

      const diff = Math.abs(ref.getTime() - prev.getTime());
      const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        count++;
        ref = prev;
      } else if (diffDays > 1) {
        break;
      }
    }
    return count;
  }
  return 0;
}

export const Route = createFileRoute("/home")({ component: HomePage });

function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [lastRead, setLastRead] = useState<any>(null);
  const [notesReadCount, setNotesReadCount] = useState(0);
  const [quizzesDoneCount, setQuizzesDoneCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<any>(null);
  const [urgentTask, setUrgentTask] = useState<any>(null);

  useEffect(() => {
    // 1. Read last read PDF from localStorage
    const saved = localStorage.getItem("pdf_last_read");
    if (saved) {
      try {
        setLastRead(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Count notes read from localStorage
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("pdf_progress_")) {
        count++;
      }
    }
    setNotesReadCount(count);

    // 3. Fetch latest notification
    const fetchLatestNotification = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setLatestNotification(data[0]);
      }
    };
    fetchLatestNotification();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchStatsAndTasks = async () => {
      // 1. Fetch user profile
      const { data: prof, error: profError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!profError && prof) {
        setProfile(prof);
      }

      // 2. Fetch quiz attempts for count & streak
      const { data: attemptsData, error: attemptsError } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, attempted_at")
        .eq("user_id", user.id);

      if (!attemptsError && attemptsData) {
        const uniqueQuizIds = new Set(attemptsData.map((item: any) => item.quiz_id));
        setQuizzesDoneCount(uniqueQuizIds.size);

        const calculatedStreak = calculateStreak(attemptsData);
        setStreakDays(calculatedStreak);
      }

      // 5. Fetch urgent incomplete study task sorted by priority and date
      const { data: tasksData, error: tasksError } = await supabase
        .from("study_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_completed", false);

      if (!tasksError && tasksData) {
        const sorted = [...tasksData].sort((a, b) => {
          const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
          const pA = priorityOrder[a.priority?.toLowerCase()] || 4;
          const pB = priorityOrder[b.priority?.toLowerCase()] || 4;
          if (pA !== pB) return pA - pB;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
        if (sorted.length > 0) {
          setUrgentTask(sorted[0]);
        }
      }
    };

    fetchStatsAndTasks();
  }, [user]);

  const hasLastRead = !!lastRead;
  const completion = hasLastRead ? lastRead.progress : 0;
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (completion / 100) * c;

  const resumeTitle = hasLastRead ? lastRead.title : "";
  const resumeSubtitle = hasLastRead 
    ? `Page ${lastRead.pageNum} of ${lastRead.numPages} · ${Math.max(1, Math.round((lastRead.numPages - lastRead.pageNum) * 1.5))} min left`
    : "";
  const resumeId = hasLastRead ? lastRead.id : "";

  const hour = new Date().getHours();
  let timeGreeting = "Good evening";
  if (hour < 12) timeGreeting = "Good morning";
  else if (hour < 17) timeGreeting = "Good afternoon";

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";

  return (
    <MobileFrame withTabs>
      <div className="px-5 pt-5 pb-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{timeGreeting},</p>
            <h1 className="font-display font-bold text-2xl text-foreground">{displayName} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger" />
            </Link>
            <Link
              to="/tasks"
              aria-label="My Study Tasks"
              className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
            >
              <CheckSquare size={18} />
            </Link>
          </div>
        </div>

        {/* subscription banner */}
        <div className="rounded-2xl bg-primary px-4 py-3 flex items-center justify-between text-white">
          <div>
            <p className="text-[11px] text-white/70">Subscription</p>
            <p className="font-display font-semibold text-sm">FR Complete · Active</p>
          </div>
          <span className="text-[10px] font-bold uppercase bg-success-light text-success px-2 py-1 rounded-full">
            Active
          </span>
        </div>

        {/* progress + continue card */}
        {hasLastRead ? (
          <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4 animate-fade-in">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-primary-light)" strokeWidth="9" />
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display font-bold text-xl text-primary">{completion}%</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">done</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Continue learning</p>
              <p className="font-display font-semibold text-sm text-foreground truncate">
                {resumeTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{resumeSubtitle}</p>
              <Link
                to="/notes/$id"
                params={{ id: resumeId }}
                className="mt-2 inline-flex items-center gap-1.5 h-8 rounded-lg bg-success px-3 text-[12px] font-semibold text-white"
              >
                <Play size={12} fill="white" /> Resume
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border p-5 text-center flex flex-col items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <p className="font-display font-semibold text-sm text-foreground">Ready to start studying?</p>
            <p className="text-xs text-muted-foreground">Read study notes to track your progress.</p>
            <Link
              to="/notes"
              className="mt-1 inline-flex items-center justify-center h-9 px-4 rounded-xl bg-primary text-xs font-semibold text-white"
            >
              Open Notes
            </Link>
          </div>
        )}

        {/* stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Notes Read" value={notesReadCount.toString()} icon={<BookOpen size={14} />} tint="bg-primary-light text-primary" />
          <Stat label="Quizzes Done" value={quizzesDoneCount.toString()} icon={<ListChecks size={14} />} tint="bg-success-light text-success" />
          <Stat label="Streak" value={`${streakDays}d`} icon={<Flame size={14} />} tint="bg-warning-light text-warning" />
        </div>

        {/* announcement */}
        {latestNotification && (
          <Link
            to="/notifications"
            className="block rounded-2xl bg-primary-light border border-primary/15 p-4 flex gap-3 hover:bg-primary/20 transition-all text-left animate-fade-in"
          >
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
              <Megaphone size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm text-foreground">
                {latestNotification.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {latestNotification.body}
              </p>
            </div>
          </Link>
        )}

        {/* urgent task */}
        {urgentTask && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Urgent Study Task</p>
            <div className="flex items-start justify-between gap-3 mt-2">
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-sm text-foreground truncate">
                  {urgentTask.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Due: {new Date(urgentTask.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · Chapter: {urgentTask.chapter_tag || "General"}
                </p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                urgentTask.priority === "high" ? "bg-danger-light text-danger" :
                urgentTask.priority === "medium" ? "bg-warning-light text-warning" :
                "bg-success-light text-success"
              }`}>
                {urgentTask.priority}
              </span>
            </div>
            <Link
              to="/tasks"
              className="mt-3 w-full h-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center transition-colors"
            >
              Go to Tasks
            </Link>
          </div>
        )}

        {/* quick links */}
        <div className="grid grid-cols-2 gap-3">
          <QuickLink to="/progress" label="Progress" desc="Heatmap & weak areas" />
          <QuickLink to="/leaderboard" label="Leaderboard" desc="Where you rank" />
          <QuickLink to="/revision" label="Revision" desc="Quick summaries" />
          <QuickLink to="/referral" label="Refer & earn" desc="Invite friends" />
        </div>
      </div>
    </MobileFrame>
  );
}

function Stat({ label, value, icon, tint }: { label: string; value: string; icon: React.ReactNode; tint: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3">
      <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${tint}`}>{icon}</div>
      <p className="mt-2 font-display font-bold text-lg text-foreground leading-none">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickLink({ to, label, desc }: { to: "/progress" | "/leaderboard" | "/revision" | "/referral"; label: string; desc: string }) {
  return (
    <Link to={to} className="rounded-2xl bg-card border border-border p-3 hover:border-primary/40 transition-colors">
      <p className="font-display font-semibold text-sm text-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
    </Link>
  );
}
