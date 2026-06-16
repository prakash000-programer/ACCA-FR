import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { Search, ChevronDown, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/notes/")({ component: NotesPage });

interface ContentItem {
  id: string;
  title: string;
  chapter: string | null;
  topic: string | null;
  pdf_path: string | null;
  is_published: boolean;
}

function NotesPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const map: Record<string, number> = {};
    contents.forEach((c) => {
      const stored = localStorage.getItem(`pdf_progress_${c.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.progress === "number") {
            map[c.id] = parsed.progress;
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
    setProgressMap(map);
  }, [contents]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("content")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setContents(data || []);
      } catch (err) {
        console.error("Error fetching notes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  const filtered = contents.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.chapter?.toLowerCase().includes(q) ||
      c.topic?.toLowerCase().includes(q)
    );
  });

  // Group by chapter
  const chaptersMap: Record<string, ContentItem[]> = {};
  filtered.forEach((c) => {
    const chName = c.chapter || "General Notes";
    if (!chaptersMap[chName]) {
      chaptersMap[chName] = [];
    }
    chaptersMap[chName].push(c);
  });

  const chaptersList = Object.keys(chaptersMap).map((chName) => ({
    title: chName,
    topics: chaptersMap[chName],
  }));

  const displayChapters = chaptersList;

  return (
    <MobileFrame withTabs>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">Notes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Chapter-wise study material</p>
          </div>
          <Link
            to="/contact"
            className="h-9 px-3.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/95 transition-all flex items-center gap-1.5 shadow-sm shrink-0"
          >
            Contact Admin
          </Link>
        </div>

        <div className="relative mt-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search topics, standards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 rounded-xl bg-card border border-border pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="px-5 space-y-2.5 pb-24">
        {loading && contents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-3" />
            <p className="text-xs">Loading study material...</p>
          </div>
        ) : displayChapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <BookOpen size={32} className="text-muted-foreground/40 mb-3" />
            <p className="text-xs">No topics matched your search.</p>
          </div>
        ) : (
          displayChapters.map((ch, i) => {
            const isOpen = open === ch.title || (open === null && i === 0);
            return (
              <div key={ch.title} className="rounded-2xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? "" : ch.title)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                >
                  <span className="font-display font-semibold text-[14px] text-foreground">{ch.title}</span>
                  <ChevronDown
                    size={18}
                    className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-background/40 p-3 space-y-2">
                    {ch.topics.map((t) => (
                      <div key={t.id} className="relative rounded-xl bg-card border border-border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary-light px-2 py-0.5 rounded-full">
                              {ch.title.split("·")[0].trim()}
                            </span>
                            <div className="flex items-center gap-2 mt-1.5">
                              <p className="font-display font-semibold text-[13px] text-foreground truncate flex-1">
                                {t.title}
                              </p>
                              {progressMap[t.id] !== undefined && (
                                <span className="text-[10px] font-medium text-success whitespace-nowrap bg-success-light px-2 py-0.5 rounded-full">
                                  {progressMap[t.id]}% read
                                </span>
                              )}
                            </div>
                            {progressMap[t.id] !== undefined && (
                              <div className="w-full bg-border h-1 rounded-full overflow-hidden mt-2">
                                <div 
                                  className="bg-success h-full transition-all duration-300" 
                                  style={{ width: `${progressMap[t.id]}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <Link
                            to="/notes/$id"
                            params={{ id: t.id }}
                            className="h-8 px-3 rounded-lg border-2 border-primary text-primary text-xs font-semibold flex items-center hover:bg-primary hover:text-white transition-colors shrink-0"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </MobileFrame>
  );
}
