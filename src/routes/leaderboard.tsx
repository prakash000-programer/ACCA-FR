import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Crown, Medal, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/leaderboard")({ component: LeaderboardPage });

const tabs = ["This Week", "This Month", "All Time"];

function LeaderboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        setLoading(true);
        // Fetch attempts joined with user information
        const { data, error } = await supabase
          .from("quiz_attempts")
          .select("score, attempted_at, users (id, full_name, email)");

        if (error) throw error;
        setAttempts(data || []);
      } catch (err) {
        console.error("Error loading leaderboard attempts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, []);

  // Filter attempts based on selected time frame
  const getFilteredAttempts = () => {
    const now = new Date();
    return attempts.filter((a) => {
      if (!a.users) return false; // Skip if no user record associated
      if (a.users.email === "admin@accafr.in") return false; // Exclude admin
      const attemptedAt = new Date(a.attempted_at);
      
      if (activeTab === 0) {
        // This Week: 7 days limit
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return attemptedAt >= oneWeekAgo;
      } else if (activeTab === 1) {
        // This Month: 30 days limit
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return attemptedAt >= oneMonthAgo;
      }
      // All Time
      return true;
    });
  };

  // Group and rank users
  const getRankedUsers = () => {
    const filtered = getFilteredAttempts();
    const userScores: Record<string, { id: string; name: string; score: number; email: string; isCurrentUser: boolean }> = {};

    filtered.forEach((attempt) => {
      const dbUser = attempt.users;
      if (!dbUser) return;

      const userId = dbUser.id;
      const userName = dbUser.full_name || dbUser.email?.split("@")[0] || "Student";
      const points = (attempt.score || 0) * 100; // 100 points per correct answer

      if (userScores[userId]) {
        userScores[userId].score += points;
      } else {
        userScores[userId] = {
          id: userId,
          name: userName,
          score: points,
          email: dbUser.email || "",
          isCurrentUser: user?.id === userId,
        };
      }
    });

    return Object.values(userScores).sort((a, b) => b.score - a.score);
  };

  const rankedUsers = getRankedUsers();

  // Extract Top 3 podium users (place: 1st, 2nd, 3rd)
  // Sorted array has 1st at index 0, 2nd at index 1, 3rd at index 2.
  // The layout displays: Left (2nd), Center (1st), Right (3rd).
  const podium: any[] = [];
  if (rankedUsers.length > 1) {
    podium.push({ ...rankedUsers[1], place: 2 });
  }
  if (rankedUsers.length > 0) {
    podium.push({ ...rankedUsers[0], place: 1 });
  }
  if (rankedUsers.length > 2) {
    podium.push({ ...rankedUsers[2], place: 3 });
  }

  // The rest of the leaderboard starting at rank 4
  const restUsers = rankedUsers.slice(3).map((u, index) => ({
    rank: index + 4,
    id: u.id,
    name: u.name,
    score: u.score,
    you: u.isCurrentUser,
  }));

  return (
    <MobileFrame>
      <TopBar title="Leaderboard" />

      <div className="px-5 pt-4">
        {/* time filters */}
        <div className="bg-card border border-border rounded-xl p-1 flex">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setActiveTab(i)}
              className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === i ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-[13px] text-muted-foreground mt-3">Computing rankings...</p>
          </div>
        ) : rankedUsers.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-2xl p-6 mt-6">
            <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-semibold text-[15px] text-foreground">No attempts yet</h3>
            <p className="text-[12px] text-muted-foreground mt-1 px-2">
              Be the first to complete a quiz and top the leaderboard!
            </p>
          </div>
        ) : (
          <>
            {/* podium visual */}
            <div className="mt-6 flex items-end justify-center gap-3 px-2">
              {podium.map((p) => {
                const h = p.place === 1 ? 110 : p.place === 2 ? 86 : 72;
                const tint =
                  p.place === 1
                    ? "bg-yellow text-amber-950"
                    : p.place === 2
                    ? "bg-muted-foreground/60 text-white"
                    : "bg-warning text-orange-950";

                return (
                  <div key={p.id} className="flex-1 flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-primary-light text-primary font-bold font-display flex items-center justify-center ring-4 ring-card">
                      {p.name[0]?.toUpperCase()}
                    </div>
                    <p className="mt-2 text-[12px] font-display font-semibold text-foreground truncate max-w-full">
                      {p.name.split(" ")[0]}
                      {p.isCurrentUser && " (You)"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{p.score.toLocaleString()}</p>
                    <div
                      className={`mt-2 w-full rounded-t-xl ${tint} flex items-center justify-center font-display font-bold shadow-sm`}
                      style={{ height: h }}
                    >
                      {p.place === 1 ? <Crown size={20} className="text-amber-800" /> : p.place}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ranked list */}
            <div className="mt-5 space-y-2 pb-8 max-h-[350px] overflow-y-auto no-scrollbar">
              {restUsers.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
                    r.you ? "bg-primary-light border-primary/30" : "bg-card border-border"
                  }`}
                >
                  <span className="w-6 text-center text-xs font-bold text-muted-foreground">{r.rank}</span>
                  <div className="h-9 w-9 rounded-full bg-background text-foreground font-semibold text-xs flex items-center justify-center">
                    {r.name[0]?.toUpperCase()}
                  </div>
                  <span className={`flex-1 text-sm font-medium truncate ${r.you ? "text-primary font-semibold" : "text-foreground"}`}>
                    {r.name}
                    {r.you && " (You)"}
                  </span>
                  <span className="text-sm font-display font-bold text-foreground">{r.score.toLocaleString()}</span>
                  {r.rank <= 5 && <Medal size={14} className="text-yellow shrink-0" />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MobileFrame>
  );
}
