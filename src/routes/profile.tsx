import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { Bell, Lock, HelpCircle, LogOut, ChevronRight, Flame, Loader2, Edit2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

const items = [
  { label: "Notifications", Icon: Bell },
  { label: "Change Password", Icon: Lock },
  { label: "Help & Support", Icon: HelpCircle },
  { label: "Logout", Icon: LogOut, danger: true },
];

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [quizzesCount, setQuizzesCount] = useState(0);
  const [notesReadCount, setNotesReadCount] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    try {
      setUpdatingName(true);
      const { error } = await supabase
        .from("users")
        .update({ full_name: newName.trim() })
        .eq("id", user.id);

      if (error) throw error;
      
      toast.success("Name updated successfully!");
      setProfile((prev: any) => ({ ...prev, full_name: newName.trim() }));
      setIsEditingName(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update name");
    } finally {
      setUpdatingName(false);
    }
  };

  // Fetch Profile data, Quiz count, Streak and Bookmarks count
  useEffect(() => {
    if (!user) return;

    const fetchProfileData = async () => {
      try {
        setLoading(true);

        // 1. Fetch profile info
        const { data: prof, error: profError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!profError && prof) {
          setProfile(prof);
        }

        // 2. Fetch quizzes counts & calculate streak
        const { data: attempts, error: attError } = await supabase
          .from("quiz_attempts")
          .select("quiz_id, attempted_at")
          .eq("user_id", user.id);

        if (!attError && attempts) {
          const uniqueQuizzes = new Set(attempts.map((a) => a.quiz_id));
          setQuizzesCount(uniqueQuizzes.size);

          const attemptDates = attempts.map((a) => new Date(a.attempted_at).toDateString());
          const uniqueDates = Array.from(new Set(attemptDates)).map((d) => new Date(d));
          uniqueDates.sort((a, b) => b.getTime() - a.getTime());

          if (uniqueDates.length > 0) {
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
              setStreakDays(count);
            }
          }
        }

        // 3. Count bookmarks (reads) in localStorage
        let bookmarkCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("bookmark_")) {
            bookmarkCount++;
          }
        }
        setNotesReadCount(bookmarkCount);

      } catch (err) {
        console.error("Error loading profile details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  // Handle LogOut
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully.");
      navigate({ to: "/auth", search: { mode: "login" } });
    } catch (err) {
      console.error("Error signing out:", err);
      toast.error("Failed to logout. Please try again.");
    }
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Student";
  const userRole = profile?.college ? `${profile.course} · ${profile.college}` : "ACCA FR Student";
  const isSubscribed = profile?.subscription_status === "active";

  return (
    <MobileFrame withTabs>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 px-5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[13px] text-muted-foreground mt-3">Loading profile...</p>
        </div>
      ) : (
        <>
          <div className="px-5 pt-6 pb-4 text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary text-white text-2xl font-display font-bold flex items-center justify-center ring-4 ring-primary-light">
              {displayName[0]?.toUpperCase()}
            </div>
            {isEditingName ? (
              <div className="mt-3 flex items-center justify-center gap-2 max-w-[280px] mx-auto">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 flex-1 px-3 rounded-lg bg-card border border-border text-xs outline-none focus:border-primary text-foreground"
                  placeholder="Enter your name"
                  disabled={updatingName}
                />
                <button
                  onClick={handleSaveName}
                  disabled={updatingName}
                  className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/95 transition-colors disabled:opacity-50"
                >
                  {updatingName ? "..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  disabled={updatingName}
                  className="h-8 px-2 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/95 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <h1 className="font-display font-bold text-xl text-foreground">{displayName}</h1>
                <button
                  onClick={() => {
                    setNewName(displayName);
                    setIsEditingName(true);
                  }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit name"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{userRole}</p>
            <span
              className={`inline-flex mt-2 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                isSubscribed ? "bg-success-light text-success" : "bg-danger-light text-danger"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isSubscribed ? "bg-success" : "bg-danger"}`} />{" "}
              {isSubscribed ? "Subscription Active" : "No Active Subscription"}
            </span>
          </div>

          <div className="px-5">
            <div className="grid grid-cols-3 gap-2">
              <Card label="Quizzes Done" value={quizzesCount.toString()} />
              <Card label="Bookmarks" value={notesReadCount.toString()} />
              <Card label="Streak" value={`${streakDays}d`} flame />
            </div>
          </div>

          <div className="px-5 mt-5 pb-6">
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              {items.map(({ label, Icon, danger }, i) => {
                if (label === "Logout") {
                  return (
                    <button
                      key={label}
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-none cursor-pointer hover:bg-accent/40 transition-colors"
                    >
                      <span className="h-9 w-9 rounded-xl flex items-center justify-center bg-danger-light text-danger">
                        <Icon size={16} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-danger">{label}</span>
                      <ChevronRight size={16} className="text-danger" />
                    </button>
                  );
                }

                return (
                  <Link
                    key={label}
                    to={
                      label === "Notifications"
                        ? "/notifications"
                        : label === "Help & Support"
                          ? "/contact"
                          : "/profile"
                    }
                    className={`flex items-center gap-3 px-4 py-3.5 hover:bg-accent/40 transition-colors ${
                      i !== items.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary-light text-primary">
                      <Icon size={16} />
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
                    <ChevronRight size={16} className="text-primary" />
                  </Link>
                );
              })}
            </div>

            <p className="mt-5 text-center text-[10px] text-muted-foreground">
              ACCA FR Mastery · v1.0.0
            </p>
          </div>
        </>
      )}
    </MobileFrame>
  );
}

function Card({ label, value, flame }: { label: string; value: string; flame?: boolean }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 text-center">
      <p className="font-display font-bold text-xl text-foreground inline-flex items-center gap-1">
        {flame && <Flame size={14} className="text-warning" />} {value}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
