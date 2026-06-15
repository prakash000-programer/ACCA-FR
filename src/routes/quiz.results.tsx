import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Check, X, ChevronRight, HelpCircle, Loader2, ArrowLeft, RefreshCw, Home } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const resultsSearchSchema = z.object({
  attemptId: z.string().optional(),
  score: z.number().optional(),
  correct: z.number().optional(),
  wrong: z.number().optional(),
  total: z.number().optional(),
  quizId: z.string().optional(),
});

export const Route = createFileRoute("/quiz/results")({
  component: ResultsPage,
  validateSearch: (search) => resultsSearchSchema.parse(search),
});

function ResultsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [attemptData, setAttemptData] = useState<any>(null);
  const [quizDetails, setQuizDetails] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [showAnswersDetail, setShowAnswersDetail] = useState(false);



  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        if (search.attemptId) {
          // Fetch attempt and quiz from db
          const { data, error } = await supabase
            .from("quiz_attempts")
            .select("*, quizzes(*)")
            .eq("id", search.attemptId)
            .single();

          if (error) throw error;
          setAttemptData(data);
          setQuizDetails(data.quizzes);

          // Fetch quiz questions
          const { data: qData } = await supabase
            .from("quiz_questions")
            .select("*")
            .eq("quiz_id", data.quiz_id);

          if (qData) {
            setQuestions(qData);
          }
        } else {
          // Fallback parsing from search queries
          const tempAttempt = {
            score: search.correct || 0,
            total: search.total || 0,
            answers: {},
            quiz_id: search.quizId,
          };
          setAttemptData(tempAttempt);

          if (search.quizId) {
            const { data } = await supabase
              .from("quizzes")
              .select("*")
              .eq("id", search.quizId)
              .single();
            setQuizDetails(data);

            const { data: qData } = await supabase
              .from("quiz_questions")
              .select("*")
              .eq("quiz_id", search.quizId);

            if (qData) {
              setQuestions(qData);
            }
          }
        }
      } catch (err) {
        console.error("Error loading results data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [search.attemptId, search.quizId, search.correct, search.total]);

  if (loading) {
    return (
      <MobileFrame>
        <TopBar title="Quiz Results" back="/quiz" />
        <div className="flex flex-col items-center justify-center py-32 px-5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[13px] text-muted-foreground mt-3">Fetching result details...</p>
        </div>
      </MobileFrame>
    );
  }

  if (!attemptData) {
    return (
      <MobileFrame>
        <TopBar title="Quiz Results" back="/quiz" />
        <div className="px-5 pt-12 text-center">
          <div className="rounded-2xl bg-card border border-border p-6">
            <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-semibold text-[15px] text-foreground">Result not found</h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              Could not load results. Go back to quizzes to try again.
            </p>
            <button
              onClick={() => navigate({ to: "/quiz" })}
              className="mt-5 h-11 w-full rounded-xl bg-primary text-white text-xs font-semibold"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </MobileFrame>
    );
  }

  // Calculate metrics
  const correctCount = attemptData.score;
  const totalCount = attemptData.total;
  const userAnswers = attemptData.answers || {};
  const answeredCount = Object.keys(userAnswers).length;
  
  // Calculate skipped & wrong
  const skippedCount = totalCount - answeredCount;
  const wrongCount = totalCount - correctCount - skippedCount;
  
  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (scorePercent / 100) * c;
  
  const passed = scorePercent >= 70;
  const feedbackMessage = 
    scorePercent >= 90
      ? "Perfect score! Outstanding work."
      : scorePercent >= 70
      ? "Well done! Great performance."
      : scorePercent >= 50
      ? "Good effort. Keep practicing to improve."
      : "Keep studying. Review the concepts and try again!";

  const quizId = attemptData.quiz_id;

  return (
    <MobileFrame>
      <TopBar title="Quiz Results" back="/quiz" />

      {!showAnswersDetail ? (
        <div className="px-5 pt-6 pb-8 text-center relative overflow-hidden">


          <div className="relative inline-block">
            <svg width="160" height="160" className="-rotate-90">
              <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-primary-light)" strokeWidth="12" />
              <circle
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-extrabold text-4xl text-primary">{scorePercent}%</span>
              <span className="text-[11px] text-muted-foreground">
                {correctCount} of {totalCount}
              </span>
            </div>
          </div>

          <h2 className={`mt-5 font-display font-bold text-xl ${passed ? "text-success" : "text-warning"}`}>
            {feedbackMessage}
          </h2>
          {quizDetails && (
            <p className="mt-1 text-[13px] text-muted-foreground px-2">
              Topic: {quizDetails.topic || "IAS"} · {quizDetails.title}
            </p>
          )}

          {/* breakdown */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-left">
            <Breakdown label="Correct" value={correctCount.toString()} tint="bg-success-light text-success" />
            <Breakdown label="Wrong" value={wrongCount.toString()} tint="bg-danger-light text-danger" />
            <Breakdown label="Skipped" value={skippedCount.toString()} tint="bg-background text-muted-foreground" />
          </div>

          <div className="mt-7 space-y-2.5">
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowAnswersDetail(true)}
                disabled={questions.length === 0}
                className="flex-1 h-11 rounded-xl border-2 border-primary text-primary font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-primary-light disabled:opacity-50 transition-colors"
              >
                Review Answers
              </button>
              <button
                onClick={() => navigate({ to: "/quiz", search: { quizId } })}
                className="flex-1 h-11 rounded-xl border-2 border-primary text-primary font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-primary-light transition-colors"
              >
                <RefreshCw size={13} /> Retry Quiz
              </button>
            </div>
            <Link
              to="/home"
              className="block h-12 rounded-xl bg-success text-white font-display font-semibold text-xs flex items-center justify-center gap-2 hover:bg-success/95 transition-all"
            >
              <Home size={14} /> Back to Home
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setShowAnswersDetail(false)}
              className="p-1 rounded-lg hover:bg-accent text-foreground"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="font-display font-semibold text-[15px] text-foreground">Review Answers</h2>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const userAns = userAnswers[q.id];
              const isCorrect = userAns === q.correct_option;
              
              return (
                <div key={q.id} className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Question {idx + 1}
                    </span>
                    {userAns ? (
                      isCorrect ? (
                        <span className="text-[10px] font-semibold text-success bg-success-light px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Check size={11} /> Correct
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-danger bg-danger-light px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <X size={11} /> Incorrect
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-background px-2.5 py-0.5 rounded-full">
                        Skipped
                      </span>
                    )}
                  </div>

                  <p className="mt-2.5 text-[13px] font-semibold text-foreground leading-snug">
                    {q.question_text}
                  </p>

                  <div className="mt-3.5 space-y-1.5">
                    {[
                      { key: "a", text: q.option_a },
                      { key: "b", text: q.option_b },
                      { key: "c", text: q.option_c },
                      { key: "d", text: q.option_d },
                    ].map((opt) => {
                      const wasSelected = userAns === opt.key;
                      const isOptCorrect = opt.key === q.correct_option;
                      
                      return (
                        <div
                          key={opt.key}
                          className={`text-[12px] p-2 rounded-lg flex items-center gap-2 border ${
                            isOptCorrect
                              ? "bg-success-light border-success/40 text-foreground"
                              : wasSelected && !isCorrect
                              ? "bg-danger-light border-danger/40 text-foreground"
                              : "bg-background border-border/60 text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold ${
                              isOptCorrect
                                ? "bg-success text-white"
                                : wasSelected && !isCorrect
                                ? "bg-danger text-white"
                                : "bg-card text-muted-foreground"
                            }`}
                          >
                            {opt.key.toUpperCase()}
                          </span>
                          <span className={isOptCorrect ? "font-medium text-foreground" : ""}>
                            {opt.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-3 pt-3 border-t border-border/40 text-[11px] text-muted-foreground leading-relaxed bg-background/50 p-2.5 rounded-lg">
                      <span className="font-semibold text-foreground">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowAnswersDetail(false)}
            className="mt-6 w-full h-11 rounded-xl border-2 border-primary text-primary font-semibold text-xs transition-colors"
          >
            Back to Summary
          </button>
        </div>
      )}
    </MobileFrame>
  );
}

function Breakdown({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3.5 text-center">
      <div className={`mx-auto h-7 w-7 rounded-lg flex items-center justify-center text-[12px] font-bold ${tint}`}>
        {value}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
