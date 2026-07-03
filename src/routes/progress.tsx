import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Flame, AlertTriangle, Check, Target, Loader2, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/progress")({ component: ProgressPage });

function ProgressPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [totalQuizzesCount, setTotalQuizzesCount] = useState(1);
  const [completedNotesCount, setCompletedNotesCount] = useState(0);
  const [totalNotesCount, setTotalNotesCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchProgressData = async () => {
      try {
        setLoading(true);
        
        // Fetch quiz attempts
        const { data: attemptsData } = await supabase
          .from("quiz_attempts")
          .select("*, quizzes(*)")
          .eq("user_id", user.id);

        if (attemptsData) {
          setAttempts(attemptsData);
        }

        // Fetch published quizzes count
        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("id")
          .eq("is_published", true);

        if (quizzesData && quizzesData.length > 0) {
          setTotalQuizzesCount(quizzesData.length);
        }

        // Fetch published notes count
        const { data: notesData } = await supabase
          .from("content")
          .select("id")
          .eq("is_published", true);

        if (notesData) {
          setTotalNotesCount(notesData.length);
          let completed = 0;
          notesData.forEach((n) => {
            const stored = localStorage.getItem(`pdf_progress_${n.id}`);
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.progress === 100) {
                  completed++;
                }
              } catch (e) {}
            }
          });
          setCompletedNotesCount(completed);
        }
      } catch (err) {
        console.error("Error loading progress tracker:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [user]);

  // Selected month state
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of the current month
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 26 }, (_, i) => 2025 + i); // 2025 to 2050

  // Close picker dropdowns on click outside
  useEffect(() => {
    if (!showMonthDropdown && !showYearDropdown) return;
    const handleClose = () => {
      setShowMonthDropdown(false);
      setShowYearDropdown(false);
    };
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClose);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleClose);
    };
  }, [showMonthDropdown, showYearDropdown]);

  const prevMonth = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1);
      return next;
    });
  };

  const nextMonth = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      return next;
    });
  };

  // Heatmap intensity levels: selected month aligned to Mon-Sun
  const heat = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0); // last day of month

    // Find the Monday of the week containing the 1st of the month
    const startDay = monthStart.getDay();
    const startOffset = startDay === 0 ? 6 : startDay - 1;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - startOffset);
    gridStart.setHours(0, 0, 0, 0);

    // Find the Sunday of the week containing the last day of the month
    const endDay = monthEnd.getDay();
    const endOffset = endDay === 0 ? 0 : 7 - endDay;
    const gridEnd = new Date(monthEnd);
    gridEnd.setDate(monthEnd.getDate() + endOffset);
    gridEnd.setHours(23, 59, 59, 999);

    // Group attempts by date string
    const attemptCounts: Record<string, number> = {};
    attempts.forEach((a) => {
      const d = new Date(a.attempted_at);
      const dateStr = d.toDateString();
      attemptCounts[dateStr] = (attemptCounts[dateStr] || 0) + 1;
    });

    const daysArray = [];
    const tempDate = new Date(gridStart);
    while (tempDate <= gridEnd) {
      const dateStr = tempDate.toDateString();
      const count = attemptCounts[dateStr] || 0;
      const isCurrentMonth = tempDate.getMonth() === month;

      daysArray.push({
        date: new Date(tempDate),
        count,
        level: Math.min(4, count),
        isCurrentMonth,
      });
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return daysArray;
  }, [selectedDate, attempts]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const tints = [
    "bg-slate-100 dark:bg-slate-800/60 border border-border/10",
    "bg-primary/20 dark:bg-primary/15",
    "bg-primary/45 dark:bg-primary/35",
    "bg-primary/70 dark:bg-primary/60",
    "bg-primary dark:bg-primary",
  ];

  // Syllabus coverage calculations
  const coveredCount = useMemo(() => {
    const completedQuizIds = new Set(attempts.map((a) => a.quiz_id));
    return completedQuizIds.size;
  }, [attempts]);

  const coveredPercent = totalQuizzesCount > 0 ? Math.round((coveredCount / totalQuizzesCount) * 100) : 0;
  const remainingCount = Math.max(0, totalQuizzesCount - coveredCount);

  // Donut metrics
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const strokeOffset = circumference - (coveredPercent / 100) * circumference;

  // Streak calculation
  const streak = useMemo(() => {
    if (attempts.length === 0) return 0;
    
    // YYYY-MM-DD unique dates
    const attemptDates = attempts.map((a) => new Date(a.attempted_at).toDateString());
    const uniqueDates = Array.from(new Set(attemptDates)).map((d) => new Date(d));
    
    // Sort descending
    uniqueDates.sort((a, b) => b.getTime() - a.getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mostRecent = uniqueDates[0];
    mostRecent.setHours(0, 0, 0, 0);

    if (mostRecent.getTime() !== today.getTime() && mostRecent.getTime() !== yesterday.getTime()) {
      return 0; // Streak broken
    }

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
        break; // Gap detected
      }
    }
    return count;
  }, [attempts]);

  // Topic groupings and averages
  const topicStats = useMemo(() => {
    const stats: Record<string, { score: number; total: number }> = {};
    attempts.forEach((a) => {
      const topicName = a.quizzes?.topic || "IAS";
      if (!stats[topicName]) {
        stats[topicName] = { score: 0, total: 0 };
      }
      stats[topicName].score += a.score;
      stats[topicName].total += a.total;
    });

    return Object.entries(stats).map(([name, s]) => ({
      name,
      avg: Math.round((s.score / s.total) * 100),
    }));
  }, [attempts]);

  const weakTopics = topicStats.filter((t) => t.avg < 60);
  const strongTopics = topicStats.filter((t) => t.avg >= 80);

  return (
    <MobileFrame>
      <TopBar title="Your Progress" />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 px-5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[13px] text-muted-foreground mt-3">Computing progress metrics...</p>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-8 space-y-5">
          {/* streak */}
          <div className="rounded-2xl bg-warning-light border border-warning/20 p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-warning text-white flex items-center justify-center">
              <Flame size={20} />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-lg text-foreground">{streak}-day streak</p>
              <p className="text-xs text-muted-foreground">
                {streak > 0 ? "Fantastic! Don't break it — study today." : "No active streak. Complete a quiz to start!"}
              </p>
            </div>
          </div>

          {/* heatmap */}
          <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">Study activity</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Your quiz attempts for this month</p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2.5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevMonth}
                    className="h-7 w-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-accent text-foreground transition-all active:scale-95 shrink-0"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <div className="flex items-center gap-1.5 relative select-none">
                    {/* Month selector dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowYearDropdown(false);
                          setShowMonthDropdown((prev) => !prev);
                        }}
                        className="font-display font-bold text-xs text-foreground bg-accent/40 hover:bg-accent px-2 py-1 rounded-md transition-all flex items-center gap-1 active:scale-95"
                      >
                        {selectedDate.toLocaleString(undefined, { month: "short" })}
                      </button>
                      {showMonthDropdown && (
                        <div className="absolute left-0 mt-1 z-30 w-28 rounded-lg bg-card border border-border shadow-lg max-h-48 overflow-y-auto py-1 animate-scale-in scrollbar-none">
                          {months.map((m, idx) => (
                            <button
                              key={m}
                              onClick={() => {
                                setSelectedDate((prev) => {
                                  const next = new Date(prev);
                                  next.setMonth(idx);
                                  return next;
                                });
                                setShowMonthDropdown(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-accent ${
                                selectedDate.getMonth() === idx ? "text-primary font-bold bg-primary-light/30" : "text-foreground"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Year selector dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMonthDropdown(false);
                          setShowYearDropdown((prev) => !prev);
                        }}
                        className="font-display font-bold text-xs text-foreground bg-accent/40 hover:bg-accent px-2 py-1 rounded-md transition-all flex items-center gap-1 active:scale-95"
                      >
                        {selectedDate.getFullYear()}
                      </button>
                      {showYearDropdown && (
                        <div className="absolute right-0 mt-1 z-30 w-20 rounded-lg bg-card border border-border shadow-lg max-h-48 overflow-y-auto py-1 animate-scale-in scrollbar-none">
                          {years.map((y) => (
                            <button
                              key={y}
                              onClick={() => {
                                setSelectedDate((prev) => {
                                  const next = new Date(prev);
                                  next.setFullYear(y);
                                  return next;
                                });
                                setShowYearDropdown(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-accent ${
                                selectedDate.getFullYear() === y ? "text-primary font-bold bg-primary-light/30" : "text-foreground"
                              }`}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={nextMonth}
                    className="h-7 w-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-accent text-foreground transition-all active:scale-95 shrink-0"
                    aria-label="Next month"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <span className="font-display font-semibold text-[10px] text-primary bg-primary-light/50 px-2 py-0.5 rounded-full shrink-0">
                  {attempts.length} total
                </span>
              </div>
            </div>
            
            <div className="pb-1 select-none">
              {/* Horizontal Weekdays Header */}
              <div className="grid grid-cols-7 gap-[5px] text-center text-[10px] text-muted-foreground font-semibold mb-2">
                {days.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>

              {/* Grid of days (Standard 7-column calendar format) */}
              <div className="grid grid-cols-7 gap-[5px]">
                {heat.map((d, i) => {
                  const dateStr = d.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                  const tooltip = `${dateStr}: ${d.count} ${d.count === 1 ? "attempt" : "attempts"}`;
                  
                  if (!d.isCurrentMonth) {
                    // Out of month days rendered as subtle, low-opacity placeholder boxes
                    return (
                      <div 
                        key={i} 
                        className="aspect-square rounded-[4px] bg-slate-50 dark:bg-slate-900/10 opacity-30 border border-border/5" 
                      />
                    );
                  }

                  const textColor = d.level === 0 
                    ? "text-slate-400 dark:text-slate-500" 
                    : d.level === 1 || d.level === 2 
                      ? "text-primary dark:text-primary-light font-bold" 
                      : "text-white font-bold";
                  
                  return (
                    <div
                      key={i}
                      title={tooltip}
                      className={`aspect-square rounded-[4px] transition-all duration-200 hover:scale-105 hover:ring-2 hover:ring-primary/50 cursor-pointer flex items-center justify-center text-[10px] ${tints[d.level]} ${textColor}`}
                    >
                      {d.date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
              <span className="text-[9px] text-muted-foreground">Interact with cells to view metrics</span>
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span>Less</span>
                {tints.map((t, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${t}`} />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>

          {/* donut progress circle */}
          <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-primary-light)" strokeWidth="14" />
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-primary">
                {coveredPercent}%
              </div>
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-sm">Syllabus coverage</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {coveredCount} of {totalQuizzesCount} chapters done · {remainingCount} to go
              </p>
              <div className="mt-2 flex gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded-full bg-primary text-white">Covered</span>
                <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary">Remaining</span>
              </div>
            </div>
          </div>

          {/* Notes progress card */}
          {totalNotesCount > 0 && (
            <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-primary-light)" strokeWidth="14" />
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (Math.round((completedNotesCount / totalNotesCount) * 100) / 100) * circumference}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-success">
                  {Math.round((completedNotesCount / totalNotesCount) * 100)}%
                </div>
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-sm">Notes study progress</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {completedNotesCount} of {totalNotesCount} notes read · {totalNotesCount - completedNotesCount} remaining
                </p>
                <div className="mt-2 flex gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-success text-white">Completed</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary">Pending</span>
                </div>
              </div>
            </div>
          )}

          {/* suggested plan */}
          <div className="rounded-2xl bg-primary text-white p-4 flex items-center gap-3">
            <Target size={20} />
            <div>
              <p className="font-display font-semibold text-sm">Keep up the momentum</p>
              <p className="text-[11px] text-white/80">Complete chapter notes and clear active questions.</p>
            </div>
          </div>

          {/* weak topics */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Needs revision (&lt;60%)</p>
            <div className="mt-2 space-y-2">
              {weakTopics.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground bg-background/50">
                  No topics need critical revision. Nice work!
                </div>
              ) : (
                weakTopics.map((t) => (
                  <TopicRow key={t.name} tone="weak" title={t.name} meta={`Avg score ${t.avg}%`} />
                ))
              )}
            </div>
          </div>

          {/* strong areas */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Strong areas (&gt;80%)</p>
            <div className="mt-2 space-y-2">
              {strongTopics.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground bg-background/50">
                  No strong areas yet. Keep answering quizzes to earn badges!
                </div>
              ) : (
                strongTopics.map((t) => (
                  <TopicRow key={t.name} tone="strong" title={t.name} meta={`Avg score ${t.avg}%`} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}

function TopicRow({ tone, title, meta }: { tone: "weak" | "strong"; title: string; meta: string }) {
  const weak = tone === "weak";
  return (
    <div
      className={`rounded-xl border p-3 flex items-center gap-3 ${
        weak ? "bg-danger-light/60 border-danger/20" : "bg-success-light/60 border-success/20"
      }`}
    >
      <div
        className={`h-9 w-9 rounded-lg flex items-center justify-center text-white ${
          weak ? "bg-danger" : "bg-success"
        }`}
      >
        {weak ? <AlertTriangle size={16} /> : <Check size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-sm text-foreground truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground">{meta}</p>
      </div>
      <span
        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
          weak ? "bg-danger text-white" : "bg-success text-white"
        }`}
      >
        {weak ? "Revise" : "Strong"}
      </span>
    </div>
  );
}
