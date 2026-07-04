import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import {
  Plus,
  Check,
  Calendar as CalendarIcon,
  MoreVertical,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  X,
  ShieldCheck,
  Lock,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({ component: TasksPage });

type Priority = "high" | "medium" | "low";
type Task = {
  id: string;
  title: string;
  chapter: string;
  priority: Priority;
  due: string; // ISO date YYYY-MM-DD
  notes?: string;
  completed: boolean;
  completedAt?: string;
};

type AdminTask = {
  id: string;
  title: string;
  chapter: string;
  due: string;
  assignedBy: string;
  completed: boolean;
};

const CHAPTERS = [
  "Ch 1 · Conceptual Framework",
  "Ch 2 · IFRS 15 Revenue",
  "Ch 3 · IAS 16 PPE",
  "Ch 4 · IAS 36 Impairment",
  "Ch 5 · IAS 12 Income Taxes",
  "Ch 6 · Consolidated SFP",
  "Ch 7 · Group SPL",
  "Ch 8 · Financial Analysis",
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const adminSeed: AdminTask[] = [];

const priorityStyles: Record<Priority, { pill: string; dot: string; label: string }> = {
  high: { pill: "bg-[#E02424] text-white", dot: "bg-[#E02424]", label: "High" },
  medium: { pill: "bg-[#F97316] text-white", dot: "bg-[#F97316]", label: "Medium" },
  low: { pill: "bg-success text-white", dot: "bg-success", label: "Low" },
};

function formatDue(due: string) {
  const d = new Date(due + "T00:00:00");
  const today = new Date(todayISO() + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return { label: "Today", overdue: false };
  if (diff === 1) return { label: "Tomorrow", overdue: false };
  if (diff < 0) return { label: `Overdue · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, overdue: true };
  return { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), overdue: false };
}

function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>(adminSeed);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "completed">("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAdmin, setShowAdmin] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [justChecked, setJustChecked] = useState<string | null>(null);

  // Fetch Tasks
  const fetchTasks = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("study_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rawTasks = data || [];

      // 1. Map personal tasks (where notes does NOT start with "Assigned by: ")
      const mappedPersonal: Task[] = rawTasks
        .filter((t: any) => !t.notes?.startsWith("Assigned by: "))
        .map((t) => ({
          id: t.id,
          title: t.title || "",
          chapter: t.chapter_tag || "",
          priority: (t.priority || "medium") as Priority,
          due: t.due_date || todayISO(),
          notes: t.notes || "",
          completed: t.is_completed || false,
          completedAt: t.completed_at || undefined,
        }));
      setTasks(mappedPersonal);

      // 2. Map admin-assigned tasks (where notes starts with "Assigned by: ")
      const mappedAdmin: AdminTask[] = rawTasks
        .filter((t: any) => t.notes?.startsWith("Assigned by: "))
        .map((t) => {
          const notesText = t.notes || "";
          const assignedBy = notesText.split("\n")[0].replace("Assigned by: ", "");
          return {
            id: t.id,
            title: t.title || "",
            chapter: t.chapter_tag || "General",
            due: t.due_date || todayISO(),
            assignedBy,
            completed: t.is_completed || false,
          };
        });
      setAdminTasks(mappedAdmin);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    if (!user) return;

    // Subscribe to realtime updates for study_tasks (only for the current user's rows)
    const channel = supabase
      .channel("user-tasks-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_tasks",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);



  async function toggleAdmin(id: string) {
    const task = adminTasks.find((t) => t.id === id);
    if (!task) return;

    const nextCompleted = !task.completed;
    const completedAtISO = nextCompleted ? new Date().toISOString() : null;

    setAdminTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t))
    );
    setJustChecked(id);
    setTimeout(() => setJustChecked((cur) => (cur === id ? null : cur)), 600);

    try {
      const { error } = await supabase
        .from("study_tasks")
        .update({
          is_completed: nextCompleted,
          completed_at: completedAtISO,
        })
        .eq("id", id);

      if (error) throw error;
    } catch (err) {
      console.error("Error toggling admin task:", err);
      toast.error("Failed to update task");
      fetchTasks();
    }
  }

  const active = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  
  const totalAdminPending = adminTasks.filter((t) => !t.completed).length;
  const totalAdminCompleted = adminTasks.filter((t) => t.completed).length;

  const doneCount = completed.length + totalAdminCompleted;
  const totalTasksCount = tasks.length + adminTasks.length;

  const todayCount = active.filter((t) => t.due === todayISO()).length + adminTasks.filter((t) => !t.completed && t.due === todayISO()).length;
  const overdueCount = active.filter((t) => formatDue(t.due).overdue).length + adminTasks.filter((t) => !t.completed && formatDue(t.due).overdue).length;
  const weekDone = completed.length + totalAdminCompleted;

  const filtered = useMemo(() => {
    if (filter === "today") return active.filter((t) => t.due === todayISO());
    if (filter === "upcoming") return active.filter((t) => t.due > todayISO());
    if (filter === "completed") return completed;
    return active;
  }, [tasks, filter]);

  // Toggle Complete
  async function toggle(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const nextCompleted = !task.completed;
    const completedAtISO = nextCompleted ? new Date().toISOString() : null;

    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, completed: nextCompleted, completedAt: nextCompleted ? todayISO() : undefined } : t
      );
      const todays = next.filter((t) => t.due === todayISO());
      if (todays.length > 0 && todays.every((t) => t.completed)) {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 2200);
      }
      return next;
    });

    setJustChecked(id);
    setTimeout(() => setJustChecked((cur) => (cur === id ? null : cur)), 600);

    try {
      const { error } = await supabase
        .from("study_tasks")
        .update({
          is_completed: nextCompleted,
          completed_at: completedAtISO,
        })
        .eq("id", id);

      if (error) throw error;
    } catch (err) {
      console.error("Error toggling task:", err);
      toast.error("Failed to update task");
      fetchTasks();
    }
  }

  // Delete Task
  async function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setOpenMenu(null);
    try {
      const { error } = await supabase.from("study_tasks").delete().eq("id", id);
      if (error) throw error;
      toast.success("Task deleted");
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error("Failed to delete task");
      fetchTasks();
    }
  }

  // Add Task
  async function addTask(t: Omit<Task, "id" | "completed">) {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("study_tasks")
        .insert({
          user_id: user.id,
          title: t.title,
          chapter_tag: t.chapter,
          priority: t.priority,
          due_date: t.due,
          notes: t.notes,
          is_completed: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: Task = {
        id: data.id,
        title: data.title || "",
        chapter: data.chapter_tag || "",
        priority: (data.priority || "medium") as Priority,
        due: data.due_date || todayISO(),
        notes: data.notes || "",
        completed: data.is_completed || false,
        completedAt: data.completed_at || undefined,
      };

      setTasks((prev) => [newTask, ...prev]);
      toast.success("Task added successfully!");
    } catch (err) {
      console.error("Error adding task:", err);
      toast.error("Failed to add task");
    }
  }

  return (
    <MobileFrame withTabs>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 bg-background sticky top-0 z-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-[22px] text-[#111928] leading-tight">My Study Tasks</h1>
            <p className="text-[12px] text-[#6B7280] mt-1">
              {doneCount} of {tasks.length} tasks done
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-primary text-white text-[13px] font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.98] transition"
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-5">
        <div className="rounded-2xl bg-card border border-border p-3 grid grid-cols-3 gap-2">
          <SummaryStat value={todayCount} label="Today" color="text-primary" />
          {overdueCount > 0 ? (
            <SummaryStat value={overdueCount} label="Overdue" color="text-[#E02424]" />
          ) : (
            <SummaryStat value={0} label="Overdue" color="text-muted-foreground" />
          )}
          <SummaryStat value={weekDone} label="Done this week" color="text-success" />
        </div>
      </div>

      {/* Admin Tasks */}
      <div className="px-5 pt-4">
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <button
            onClick={() => setShowAdmin((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-light to-card"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary grid place-content-center">
                <ShieldCheck size={16} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-display font-bold text-[13.5px] text-foreground leading-tight">
                  Admin Tasks
                </p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">
                  {adminTasks.filter((t) => !t.completed).length} pending · assigned by your tutors
                </p>
              </div>
            </div>
            {showAdmin ? (
              <ChevronUp size={16} className="text-primary" />
            ) : (
              <ChevronDown size={16} className="text-primary" />
            )}
          </button>
          {showAdmin && (
            <div className="p-3 space-y-2 animate-fade-in">
              {adminTasks.length === 0 && (
                <p className="text-[12px] text-muted-foreground text-center py-4">
                  No admin tasks assigned right now.
                </p>
              )}
              {adminTasks.filter((t) => !t.completed).length === 0 && adminTasks.length > 0 && (
                <p className="text-[12px] text-success text-center py-3 font-semibold">
                  All admin tasks done — see them in the Completed tab ✓
                </p>
              )}
              {adminTasks.filter((t) => !t.completed).map((t) => {
                const due = formatDue(t.due);
                return (
                  <div
                    key={t.id}
                    className={`relative rounded-xl border p-3 transition-colors ${
                      t.completed
                        ? "bg-success-light border-success/30"
                        : "bg-background border-border"
                    } ${justChecked === t.id ? "ring-2 ring-success" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleAdmin(t.id)}
                        aria-label="Toggle complete"
                        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full grid place-content-center transition-all duration-200 ${
                          t.completed
                            ? "bg-success border-success"
                            : "border-2 border-[#E5E7EB] hover:border-success"
                        }`}
                      >
                        {t.completed && (
                          <Check size={12} className="text-white animate-scale-in" strokeWidth={3} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[13.5px] font-semibold leading-snug ${
                            t.completed
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {t.title}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-light text-primary text-[10.5px] font-semibold">
                            {t.chapter}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBBF24]/15 text-[#92400E] text-[10.5px] font-semibold">
                            <ShieldCheck size={10} /> {t.assignedBy}
                          </span>
                          <span
                            className={`text-[10.5px] font-medium ${
                              due.overdue && !t.completed
                                ? "text-[#E02424]"
                                : "text-muted-foreground"
                            }`}
                          >
                            {due.label}
                          </span>
                        </div>
                      </div>
                      <span
                        className="shrink-0 inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                        title="Assigned by admin — cannot be edited or deleted"
                      >
                        <Lock size={11} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-5 pt-4">
        <div className="bg-card border border-border rounded-xl p-1 flex">
          {(["all", "today", "upcoming", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 h-9 rounded-lg text-[12px] font-semibold capitalize transition-colors ${
                filter === f ? "bg-primary text-white" : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[13px] text-muted-foreground mt-3">Loading your study tasks...</p>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-6 space-y-2.5">
          {filtered.length === 0 && filter !== "completed" && (
            <EmptyState
              icon={<ClipboardList size={36} className="text-primary" />}
              title="Add your first study task"
              subtitle="Plan revision, MCQs, and reading. You'll see them here."
              cta={() => setModalOpen(true)}
            />
          )}
          {filter === "completed" && filtered.length === 0 && (
            <EmptyState
              icon={<CheckCircle2 size={36} className="text-success" />}
              title="All tasks complete! Great work 🎉"
              subtitle="New goals waiting? Add another study task."
              cta={() => setModalOpen(true)}
            />
          )}

          {filter !== "completed" &&
            filtered.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggle={() => toggle(t.id)}
                onDelete={() => remove(t.id)}
                menuOpen={openMenu === t.id}
                onMenu={() => setOpenMenu((m) => (m === t.id ? null : t.id))}
                flash={justChecked === t.id}
              />
            ))}

          {filter === "completed" &&
            filtered.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggle={() => toggle(t.id)}
                onDelete={() => remove(t.id)}
                menuOpen={openMenu === t.id}
                onMenu={() => setOpenMenu((m) => (m === t.id ? null : t.id))}
                flash={false}
              />
            ))}

          {filter === "completed" &&
            adminTasks.filter((t) => t.completed).map((t) => {
              const due = formatDue(t.due);
              return (
                <div
                  key={t.id}
                  className="relative rounded-xl bg-card border border-border border-l-4 border-l-success p-3 shadow-sm opacity-90"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleAdmin(t.id)}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded-full grid place-content-center bg-success border-success"
                      aria-label="Mark active"
                    >
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold leading-snug text-muted-foreground line-through">
                        {t.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-light text-primary text-[10.5px] font-semibold">
                          {t.chapter}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBBF24]/15 text-[#92400E] text-[10.5px] font-semibold">
                          <ShieldCheck size={10} /> {t.assignedBy}
                        </span>
                        <span className="text-[10.5px] font-medium text-muted-foreground">
                          {due.label}
                        </span>
                      </div>
                    </div>
                    <Lock size={11} className="text-muted-foreground shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}

          {/* Completed collapsible in All view */}
          {filter === "all" && completed.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowCompleted((s) => !s)}
                className="w-full flex items-center justify-between text-[12px] font-semibold text-[#6B7280] py-2"
              >
                <span>
                  {showCompleted ? "Hide" : "Show"} completed ({completed.length})
                </span>
                {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showCompleted && (
                <div className="space-y-2.5 animate-fade-in">
                  {completed.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onToggle={() => toggle(t.id)}
                      onDelete={() => remove(t.id)}
                      menuOpen={openMenu === t.id}
                      onMenu={() => setOpenMenu((m) => (m === t.id ? null : t.id))}
                      flash={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <AddTaskModal
          onClose={() => setModalOpen(false)}
          onAdd={(t) => {
            addTask(t);
            setModalOpen(false);
          }}
        />
      )}

      {confetti && <Confetti />}
    </MobileFrame>
  );
}

function SummaryStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`font-display font-bold text-xl ${color}`}>{value}</p>
      <p className="text-[10.5px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  cta: () => void;
}) {
  return (
    <div className="rounded-2xl bg-card border border-dashed border-border py-10 px-6 text-center flex flex-col items-center gap-3">
      <div className="h-16 w-16 rounded-full bg-primary-light grid place-content-center">{icon}</div>
      <div>
        <p className="font-display font-bold text-sm text-foreground">{title}</p>
        <p className="text-[12px] text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <button
        onClick={cta}
        className="mt-1 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-white text-xs font-semibold"
      >
        <Plus size={14} /> Add Task
      </button>
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
  onDelete,
  menuOpen,
  onMenu,
  flash,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  menuOpen: boolean;
  onMenu: () => void;
  flash: boolean;
}) {
  const due = formatDue(task.due);
  const p = priorityStyles[task.priority];

  // swipe state for native feel
  const [dx, setDx] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) {
      return;
    }
    setStartX(e.touches[0].clientX);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startX === null) return;
    const delta = e.touches[0].clientX - startX;
    setDx(Math.max(-96, Math.min(96, delta)));
  }
  function onTouchEnd() {
    if (dx < -60) {
      setDx(-88);
    } else if (dx > 60 && !task.completed) {
      onToggle();
      setDx(0);
    } else {
      setDx(0);
    }
    setStartX(null);
  }

  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".task-menu-container")) {
        onMenu();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [menuOpen, onMenu]);

  return (
    <div className="relative">
      {dx < 0 && (
        <div className="absolute inset-0 flex items-center justify-end pr-4 rounded-xl bg-[#E02424]">
          <button onClick={onDelete} className="text-white text-xs font-semibold inline-flex items-center gap-1">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${dx}px)` }}
        className={`relative rounded-xl bg-card border border-border p-3 shadow-sm transition-[transform,background-color] duration-200 ${
          task.completed ? "bg-[#F9FAFB] dark:bg-slate-900/40 border-l-4 border-l-success/70 opacity-75" : ""
        } ${flash ? "bg-success-light" : ""}`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            aria-label="Toggle complete"
            className={`mt-0.5 h-5 w-5 shrink-0 rounded-full grid place-content-center transition-all duration-200 ${
              task.completed
                ? "bg-success border-success scale-100"
                : "border-2 border-[#E5E7EB] hover:border-success"
            }`}
          >
            {task.completed && <Check size={12} className="text-white animate-scale-in" strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            <p
              className={`text-[13.5px] font-semibold leading-snug ${
                task.completed ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {task.title}
            </p>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {task.chapter && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-light text-primary text-[10.5px] font-semibold">
                  {task.chapter}
                </span>
              )}
              <span className={`text-[10.5px] font-medium ${due.overdue && !task.completed ? "text-[#E02424]" : "text-muted-foreground"}`}>
                {due.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`h-2.5 w-2.5 rounded-full ${task.completed ? "bg-slate-300 dark:bg-slate-700" : p.dot}`} title={p.label} />
            <div className="relative task-menu-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMenu();
                }}
                className="h-7 w-7 grid place-content-center rounded-md text-muted-foreground hover:bg-background"
              >
                <MoreVertical size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-36 rounded-xl bg-card border border-border shadow-lg py-1 animate-scale-in">
                  <MenuItem
                    icon={<CheckCircle2 size={13} />}
                    label={task.completed ? "Mark Active" : "Mark Complete"}
                    color="text-success"
                    onClick={() => {
                      onToggle();
                      onMenu();
                    }}
                  />
                  <MenuItem 
                    icon={<Trash2 size={13} />} 
                    label="Delete" 
                    color="text-[#E02424]" 
                    onClick={() => {
                      onDelete();
                      onMenu();
                    }} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-background ${color}`}
    >
      {icon} {label}
    </button>
  );
}

function AddTaskModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (t: Omit<Task, "id" | "completed">) => void;
}) {
  const [title, setTitle] = useState("");

  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState(todayISO());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in">
      <div className="w-full bg-card sm:rounded-2xl rounded-t-2xl p-5 max-h-[88%] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-base text-foreground">New Study Task</h2>
          <button onClick={onClose} className="h-8 w-8 grid place-content-center rounded-lg text-muted-foreground hover:bg-background">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5">
          <Field label="Task title">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Revise IAS 36 — Impairment"
              className="w-full h-11 rounded-xl bg-background border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </Field>



          <Field label="Priority">
            <div className="flex gap-2">
              {(["high", "medium", "low"] as Priority[]).map((p) => {
                const s = priorityStyles[p];
                const active = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 h-9 rounded-full text-[12px] font-semibold transition ${
                      active ? s.pill : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Due date">
            <div className="relative">
              <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full h-11 rounded-xl bg-background border border-border pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
              />
            </div>
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Key formulas, references…"
              className="w-full rounded-xl bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </Field>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-background"
          >
            Cancel
          </button>
          <button
            disabled={!title.trim()}
            onClick={() => onAdd({ title: title.trim(), chapter: "", priority, due, notes })}
            className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 hover:bg-primary/90"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-semibold text-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 36 });
  const colors = ["#1A56DB", "#057A55", "#FBBF24", "#F97316", "#E02424"];
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const dur = 1.4 + Math.random() * 0.8;
        const color = colors[i % colors.length];
        const size = 6 + Math.random() * 6;
        return (
          <span
            key={i}
            style={{
              left: `${left}%`,
              backgroundColor: color,
              width: size,
              height: size * 0.4,
              animationDelay: `${delay}s`,
              animationDuration: `${dur}s`,
            }}
            className="absolute top-0 rounded-sm animate-[confetti_1.6s_ease-in_forwards]"
          />
        );
      })}
      <style>{`@keyframes confetti { 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(900px) rotate(540deg);opacity:0} }`}</style>
    </div>
  );
}
