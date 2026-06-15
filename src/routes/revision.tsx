import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Check, Search, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/revision")({ component: RevisionPage });

const tabs = ["By Chapter", "By Topic", "Full Exam"];

const TOPIC_SUMMARIES: Record<string, string[]> = {
  "conceptual framework": [
    "Information must be relevant and faithfully represented.",
    "Qualitative characteristics: comparability, verifiability, timeliness, understandability.",
    "Going concern assumption is the fundamental basis.",
    "Assets are present economic resources controlled by the entity as a result of past events.",
    "Liabilities are present obligations to transfer an economic resource."
  ],
  "qualitative characteristics": [
    "Fundamental: Relevance and Faithful Representation.",
    "Enhancing: Comparability, Verifiability, Timeliness, Understandability.",
    "Materiality is an entity-specific aspect of relevance.",
    "Faithful representation requires completeness, neutrality, and freedom from error."
  ],
  "group accounts": [
    "Consolidate 100% of subsidiary's assets and liabilities.",
    "Non-controlling interest (NCI) shown in equity.",
    "Eliminate intra-group balances and unrealised profits (PURP).",
    "Goodwill = Consideration + NCI at acquisition - Net assets at acquisition."
  ],
  "revenue": [
    "Step 1: Identify the contract with a customer.",
    "Step 2: Identify separate performance obligations.",
    "Step 3: Determine the transaction price.",
    "Step 4: Allocate transaction price to obligations.",
    "Step 5: Recognise revenue when obligations are satisfied."
  ],
  "ifrs 15": [
    "Step 1: Identify the contract with a customer.",
    "Step 2: Identify separate performance obligations.",
    "Step 3: Determine the transaction price.",
    "Step 4: Allocate transaction price to obligations.",
    "Step 5: Recognise revenue when obligations are satisfied."
  ],
  "property, plant & equipment": [
    "IAS 16 applies to tangible assets held for production/rental/admin.",
    "Initial measurement is at cost (including purchase price, directly attributable costs, dismantling).",
    "Subsequent measurement: Cost Model vs Revaluation Model.",
    "Depreciate systematically over the asset's useful economic life."
  ],
  "ias 16": [
    "IAS 16 applies to tangible assets held for production/rental/admin.",
    "Initial measurement is at cost (including purchase price, directly attributable costs, dismantling).",
    "Subsequent measurement: Cost Model vs Revaluation Model.",
    "Depreciate systematically over the asset's useful economic life."
  ],
  "intangible assets": [
    "IAS 38 requires an intangible asset to be identifiable, controlled, and have future benefits.",
    "Research expenditure is always expensed.",
    "Development expenditure is capitalised only if PIRATE criteria are met.",
    "Amortise finite-lived intangibles; test infinite-lived intangibles annually for impairment."
  ],
  "ias 38": [
    "IAS 38 requires an intangible asset to be identifiable, controlled, and have future benefits.",
    "Research expenditure is always expensed.",
    "Development expenditure is capitalised only if PIRATE criteria are met.",
    "Amortise finite-lived intangibles; test infinite-lived intangibles annually for impairment."
  ],
  "leases": [
    "IFRS 16 removes the distinction between operating and finance leases for lessees.",
    "Lessee recognises Right-of-Use (ROU) asset and lease liability.",
    "Lease liability is measured at the present value of outstanding lease payments.",
    "ROU asset is depreciated over lease term or useful life, whichever is shorter.",
    "Exemptions: Short-term leases (<= 12 months) and low-value assets."
  ],
  "ifrs 16": [
    "IFRS 16 removes the distinction between operating and finance leases for lessees.",
    "Lessee recognises Right-of-Use (ROU) asset and lease liability.",
    "Lease liability is measured at the present value of outstanding lease payments.",
    "ROU asset is depreciated over lease term or useful life, whichever is shorter.",
    "Exemptions: Short-term leases (<= 12 months) and low-value assets."
  ]
};

const getSummaryBullets = (title: string) => {
  const t = title.toLowerCase();
  for (const [key, bullets] of Object.entries(TOPIC_SUMMARIES)) {
    if (t.includes(key)) {
      return bullets;
    }
  }
  return [
    `Understand key definitions and concepts relating to ${title}.`,
    "Identify applicable IFRS/IAS standard recognition criteria.",
    "Understand measurement rules: initial costs versus subsequent model rules.",
    "Learn presentation rules: balance sheet presentation and income statement charges."
  ];
};

function RevisionPage() {
  const [active, setActive] = useState(0); // 0: By Chapter, 1: By Topic, 2: Full Exam
  const [examMode, setExamMode] = useState(false);
  const [revised, setRevised] = useState<Record<string, boolean>>({});
  const [contents, setContents] = useState<any[]>([]);
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
        console.error("Error fetching revision data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  const handleToggleRevised = (id: string) => {
    const nextRevised = { ...revised, [id]: !revised[id] };
    setRevised(nextRevised);
    localStorage.setItem("acca_revised_topics", JSON.stringify(nextRevised));
  };

  const activeContents = contents.length > 0 ? contents : (loading ? [] : [
    { id: "framework", title: "The IASB Conceptual Framework", chapter: "Chapter 1 · Conceptual Framework" },
    { id: "qc", title: "Qualitative Characteristics", chapter: "Chapter 1 · Conceptual Framework" },
    { id: "consol-bs", title: "Consolidated Statement of Financial Position", chapter: "Chapter 2 · Group Accounts" },
    { id: "ifrs15", title: "IFRS 15 Revenue from Contracts with Customers", chapter: "Chapter 3 · Revenue" },
    { id: "ias-16", title: "IAS 16 Property, Plant & Equipment", chapter: "Chapter 4 · Non-current Assets" }
  ]);

  const filtered = activeContents.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.chapter?.toLowerCase().includes(q)
    );
  });

  // Render content based on active tab
  const renderList = () => {
    if (active === 0) {
      // By Chapter
      const chaptersMap: Record<string, any[]> = {};
      filtered.forEach((c) => {
        const chName = c.chapter || "General Notes";
        if (!chaptersMap[chName]) {
          chaptersMap[chName] = [];
        }
        chaptersMap[chName].push(c);
      });

      return Object.entries(chaptersMap).map(([chName, items]) => (
        <div key={chName} className="space-y-3">
          <h2 className="font-display font-semibold text-xs text-primary uppercase tracking-wider pl-1">{chName}</h2>
          {items.map((s) => renderCard(s))}
        </div>
      ));
    } else if (active === 1) {
      // By Topic
      return filtered.map((s) => renderCard(s));
    } else {
      // Full Exam Consolidated tips
      return (
        <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
          <h3 className="font-display font-bold text-base text-foreground">Exam Strategy Tips</h3>
          <ul className="space-y-3">
            <li className="flex gap-2.5 text-sm leading-relaxed">
              <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
              <span><strong>Time Management:</strong> Ensure you leave enough time for Section C (group accounts & ratio analysis).</span>
            </li>
            <li className="flex gap-2.5 text-sm leading-relaxed">
              <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
              <span><strong>Consolidation:</strong> Always calculate goodwill and non-controlling interest first. Check the acquisition date carefully.</span>
            </li>
            <li className="flex gap-2.5 text-sm leading-relaxed">
              <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
              <span><strong>Conceptual Framework:</strong> Rote learn the qualitative characteristics — they are easy marks in Section A.</span>
            </li>
          </ul>
        </div>
      );
    }
  };

  const renderCard = (s: any) => {
    const isRevised = !!revised[s.id];
    const bullets = getSummaryBullets(s.title);
    return (
      <div key={s.id} className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-primary bg-primary-light px-2 py-0.5 rounded-full">
              {s.chapter?.split("·")[0]?.trim() || "General"}
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

  return (
    <MobileFrame>
      <TopBar title="Quick Revision" />

      <div className="px-5 pt-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search a concept..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 rounded-xl bg-card border border-border pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

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

        <label className="mt-3 flex items-center justify-between rounded-xl bg-primary-light border border-primary/15 px-3 py-2.5">
          <div>
            <p className="text-[12px] font-display font-semibold text-primary">Exam Mode</p>
            <p className="text-[10px] text-foreground/70">Hide hints, show headings only</p>
          </div>
          <button
            onClick={() => setExamMode((v) => !v)}
            className={`h-6 w-11 rounded-full transition-colors relative ${
              examMode ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                examMode ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      <div className="px-5 pt-4 pb-24 space-y-4">
        {loading && contents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-3" />
            <p className="text-xs">Loading revision notes...</p>
          </div>
        ) : filtered.length === 0 && active !== 2 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <BookOpen size={32} className="text-muted-foreground/40 mb-3" />
            <p className="text-xs">No concepts found.</p>
          </div>
        ) : (
          renderList()
        )}
      </div>
    </MobileFrame>
  );
}
