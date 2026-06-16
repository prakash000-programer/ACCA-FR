import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Check, Search, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/revision")({ component: RevisionPage });

const tabs = ["By Topic", "Full Exam"];

interface RevisionSummary {
  id: string;
  type: "topic" | "exam";
  title: string;
  bullets: string[];
  content_id: string | null;
  content?: {
    title: string;
    chapter: string | null;
  } | null;
}

function RevisionPage() {
  const [active, setActive] = useState(0); // 0: By Topic, 1: Full Exam
  const [examMode, setExamMode] = useState(false);
  const [revised, setRevised] = useState<Record<string, boolean>>({});
  const [summaries, setSummaries] = useState<RevisionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("acca_revised_topics");
    if (saved) {
      try {
        setRevised(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing revised status:", e);
      }
    }

    const fetchSummaries = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("revision_summaries")
          .select("*, content:content_id (title, chapter)")
          .order("created_at", { ascending: true });

        if (error) throw error;
        setSummaries(data || []);
      } catch (err) {
        console.error("Error fetching revision summaries:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, []);

  const handleToggleRevised = (id: string) => {
    const nextRevised = { ...revised, [id]: !revised[id] };
    setRevised(nextRevised);
    localStorage.setItem("acca_revised_topics", JSON.stringify(nextRevised));
  };

  const topicSummaries = summaries.filter((s) => s.type === "topic");

  const filtered = topicSummaries.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.content?.chapter?.toLowerCase().includes(q)
    );
  });

  // Render content based on active tab
  const renderList = () => {
    if (active === 0) {
      // By Topic
      return filtered.map((s) => renderCard(s));
    } else {
      // Full Exam Consolidated tips from DB
      const examSummaries = summaries.filter((s) => s.type === "exam");
      return examSummaries.map((s) => (
        <div key={s.id} className="rounded-2xl bg-card border border-border p-5 space-y-4 animate-fade-in">
          <h3 className="font-display font-bold text-base text-foreground">{s.title}</h3>
          <ul className="space-y-3">
            {(Array.isArray(s.bullets) ? s.bullets : []).map((b, j) => (
              <li key={j} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      ));
    }
  };

  const renderCard = (s: RevisionSummary) => {
    const isRevised = !!revised[s.id];
    const bullets = Array.isArray(s.bullets) ? s.bullets : [];
    return (
      <div key={s.id} className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-primary bg-primary-light px-2 py-0.5 rounded-full">
              {s.content?.chapter?.split("·")[0]?.trim() || "General"}
            </span>
            <h3 className="font-display font-bold text-sm text-foreground mt-1.5">{s.title}</h3>
          </div>
        </div>

        {!examMode && (
          <ul className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3">
            {bullets.map((b, j) => (
              <li key={j} className="flex gap-2 text-[12px] leading-snug text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => handleToggleRevised(s.id)}
          className={`mt-4 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${
            isRevised ? "bg-success text-white" : "bg-success-light text-success"
          }`}
        >
          <Check size={14} /> {isRevised ? "Revised" : "Mark as Revised"}
        </button>
      </div>
    );
  };

  const showEmptyTopicState = active === 0 && filtered.length === 0;
  const showEmptyExamState = active === 1 && summaries.filter((s) => s.type === "exam").length === 0;

  return (
    <MobileFrame>
      <TopBar title="Quick Revision" />

      <div className="px-5 pt-4">
        {active === 0 && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search a concept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 rounded-xl bg-card border border-border pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        <div className="mt-3 bg-card border border-border rounded-xl p-1 flex">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setActive(i)}
              className={`flex-1 h-9 rounded-lg text-[12px] font-semibold transition-all ${
                active === i ? "bg-primary text-white" : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {active === 0 && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-primary-light border border-primary/15 px-3 py-2.5">
            <div>
              <p className="text-[12px] font-display font-semibold text-primary">Exam Mode</p>
              <p className="text-[10px] text-foreground/70">Hide hints, show headings only</p>
            </div>
            <button
              onClick={() => setExamMode((v) => !v)}
              className={`h-6 w-11 rounded-full transition-colors duration-200 ease-in-out relative outline-none focus:outline-none ${
                examMode ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                  examMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}
      </div>

      <div className="px-5 pt-4 pb-24 space-y-4">
        {loading && summaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-3" />
            <p className="text-xs">Loading revision notes...</p>
          </div>
        ) : showEmptyTopicState ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <BookOpen size={32} className="text-muted-foreground/40 mb-3" />
            <p className="text-xs">No concepts found.</p>
          </div>
        ) : showEmptyExamState ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <BookOpen size={32} className="text-muted-foreground/40 mb-3" />
            <p className="text-xs">No exam summaries found.</p>
          </div>
        ) : (
          renderList()
        )}
      </div>
    </MobileFrame>
  );
}
