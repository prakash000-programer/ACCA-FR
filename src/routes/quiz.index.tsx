import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Check, X, Timer, BookOpen, Clock, Award, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const quizSearchSchema = z.object({
  quizId: z.string().optional(),
});

export const Route = createFileRoute("/quiz/")({
  component: QuizPage,
  validateSearch: (search) => quizSearchSchema.parse(search),
});

function QuizPage() {
  const navigate = useNavigate();
  const { quizId } = Route.useSearch();
  const { user } = useAuth();

  // Screen 1: Quiz List States
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  // Screen 2: Active Attempt States
  const [quizDetails, setQuizDetails] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Quiz List & previous attempts
  useEffect(() => {
    if (quizId) return;

    const fetchQuizList = async () => {
      try {
        setLoadingQuizzes(true);
        
        // Fetch published quizzes
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*, quiz_questions(id)")
          .eq("is_published", true);

        if (quizError) throw quizError;
        setQuizzes(quizData || []);

        if (user) {
          const { data: attemptData, error: attemptError } = await supabase
            .from("quiz_attempts")
            .select("quiz_id, score, total")
            .eq("user_id", user.id);

          if (!attemptError && attemptData) {
            setAttempts(attemptData);
          }
        }
      } catch (err) {
        console.error("Error loading quiz list:", err);
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchQuizList();
  }, [quizId, user]);

  // Load Active Quiz details and questions
  useEffect(() => {
    if (!quizId) return;

    const fetchActiveQuiz = async () => {
      try {
        setLoadingQuiz(true);
        setCurrentIndex(0);
        setSelectedOption(null);
        setQuestionSubmitted(false);
        setAnswers({});

        // Fetch quiz info
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId)
          .single();

        if (quizError) throw quizError;
        setQuizDetails(quizData);
        setTimeRemaining(quizData.time_limit || 60);

        // Fetch quiz questions
        const { data: questionData, error: questionError } = await supabase
          .from("quiz_questions")
          .select("*")
          .eq("quiz_id", quizId);

        if (questionError) throw questionError;
        setQuestions(questionData || []);
      } catch (err) {
        console.error("Error loading active quiz:", err);
      } finally {
        setLoadingQuiz(false);
      }
    };

    fetchActiveQuiz();
  }, [quizId]);

  // Submit Quiz logic (shared)
  const submitQuiz = async (currentAnswers: Record<string, string>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    let correctCount = 0;
    questions.forEach((q) => {
      const chosen = currentAnswers[q.id];
      if (chosen === q.correct_option) {
        correctCount++;
      }
    });

    try {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .insert({
          user_id: user?.id,
          quiz_id: quizId,
          score: correctCount,
          total: questions.length,
          answers: currentAnswers,
        })
        .select("id")
        .single();

      if (error) throw error;

      navigate({
        to: "/quiz/results",
        search: { attemptId: data.id },
      });
    } catch (err) {
      console.error("Failed to submit quiz attempt:", err);
      // Fallback passing full score state in search query
      navigate({
        to: "/quiz/results",
        search: {
          score: Math.round((correctCount / questions.length) * 100),
          correct: correctCount,
          wrong: questions.length - correctCount,
          total: questions.length,
          quizId: quizId,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    submitQuiz(answers);
  };

  const handleNextQuestion = () => {
    if (!selectedOption || !questions[currentIndex]) return;
    const currentQuestion = questions[currentIndex];
    const updatedAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(updatedAnswers);

    const nextQuestion = questions[currentIndex + 1];
    setSelectedOption(nextQuestion ? updatedAnswers[nextQuestion.id] || null : null);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePreviousQuestion = () => {
    if (currentIndex === 0) return;

    const currentQuestion = questions[currentIndex];
    let updatedAnswers = { ...answers };
    if (selectedOption) {
      updatedAnswers[currentQuestion.id] = selectedOption;
      setAnswers(updatedAnswers);
    }

    const prevQuestion = questions[currentIndex - 1];
    setSelectedOption(prevQuestion ? updatedAnswers[prevQuestion.id] || null : null);
    setCurrentIndex((prev) => prev - 1);
  };

  const handleFinalSubmit = () => {
    if (!selectedOption || !questions[currentIndex]) return;
    const currentQuestion = questions[currentIndex];
    const updatedAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(updatedAnswers);
    submitQuiz(updatedAnswers);
  };

  // Timer effect
  useEffect(() => {
    if (!quizId || loadingQuiz || questions.length === 0 || questionSubmitted) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quizId, loadingQuiz, questions, currentIndex, questionSubmitted, answers]);

  // Render Screen 1: Quiz List
  if (!quizId) {
    return (
      <MobileFrame withTabs>
        <TopBar title="Quizzes" back="/home" />
        <div className="px-5 pt-4 pb-8">
          <div className="mb-5">
            <h1 className="font-display font-bold text-xl text-foreground">Practice Quizzes</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Test your understanding of key IFRS standards and ACCA FR concepts.
            </p>
          </div>

          {loadingQuizzes ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-[13px] text-muted-foreground mt-3">Loading available quizzes...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-card border border-border p-6">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display font-semibold text-[15px] text-foreground">No quizzes available</h3>
              <p className="text-[12px] text-muted-foreground mt-1">
                Quizzes will be added soon. Please check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz) => {
                const totalQuestions = quiz.quiz_questions?.length || 0;
                const quizAttempts = attempts.filter((a) => a.quiz_id === quiz.id);
                const bestScore = quizAttempts.length > 0
                  ? Math.max(...quizAttempts.map((a) => Math.round((a.score / a.total) * 100)))
                  : null;

                return (
                  <div
                    key={quiz.id}
                    className="rounded-2xl bg-card border border-border p-5 flex flex-col justify-between transition-all hover:border-primary/45"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary-light px-2.5 py-0.5 rounded-full">
                          {quiz.topic || "IAS"}
                        </span>
                        {bestScore !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-success bg-success-light px-2 py-0.5 rounded-full">
                              Attempted
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-success bg-success-light px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Award size={11} /> Best: {bestScore}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-warning bg-warning-light px-2 py-0.5 rounded-full">
                            New Quiz
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-semibold text-base text-foreground mt-3 leading-snug">
                        {quiz.title}
                      </h3>
                      {quiz.chapter && (
                        <p className="text-[12px] text-muted-foreground mt-1">
                          Chapter: {quiz.chapter}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                      <div className="flex gap-4 text-[12px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <BookOpen size={14} /> {totalQuestions} Qs
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} /> {Math.floor((quiz.time_limit || 60) / 60)}m
                        </span>
                      </div>

                      <button
                        onClick={() => navigate({ to: "/quiz", search: { quizId: quiz.id } })}
                        className="inline-flex items-center gap-1 text-[13px] font-display font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        Start <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </MobileFrame>
    );
  }

  // Render Screen 2: Active Attempt
  const currentQuestion = questions[currentIndex];
  const low = timeRemaining <= 30;

  return (
    <MobileFrame>
      <TopBar title={quizDetails?.title || "Quiz"} back="/quiz" />

      {loadingQuiz ? (
        <div className="flex flex-col items-center justify-center py-24 px-5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[13px] text-muted-foreground mt-3">Loading quiz questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="px-5 pt-12 text-center">
          <div className="rounded-2xl bg-card border border-border p-6">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-semibold text-[15px] text-foreground">No questions found</h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              This quiz is empty. Please contact an admin or try another quiz.
            </p>
            <button
              onClick={() => navigate({ to: "/quiz", search: { quizId: undefined } })}
              className="mt-5 h-10 px-4 rounded-xl bg-primary text-white text-xs font-semibold"
            >
              Go Back
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-8">
          {/* progress */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[12px] font-semibold ${
                low ? "text-warning" : "text-primary"
              }`}
            >
              <Timer size={13} />{" "}
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-primary-light overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-350"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {currentQuestion && (
            <>
              <div className="mt-5 rounded-2xl bg-card border border-border p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary-light inline-block px-2.5 py-0.5 rounded-full">
                  {quizDetails?.topic || "Practice"}
                </p>
                <h2 className="mt-3 font-display font-semibold text-[15px] text-foreground leading-snug">
                  {currentQuestion.question_text}
                </h2>
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  { key: "a", text: currentQuestion.option_a },
                  { key: "b", text: currentQuestion.option_b },
                  { key: "c", text: currentQuestion.option_c },
                  { key: "d", text: currentQuestion.option_d },
                ].map((o) => {
                  const isSel = selectedOption === o.key;

                  return (
                    <button
                      key={o.key}
                      onClick={() => setSelectedOption(o.key)}
                      className={`w-full text-left rounded-xl p-3.5 flex items-center gap-3 border-2 transition-all ${
                        isSel
                          ? "bg-card border-primary"
                          : "bg-card border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`h-7 w-7 rounded-lg flex items-center justify-center text-[12px] font-bold ${
                          isSel
                            ? "bg-primary text-white"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        {o.key.toUpperCase()}
                      </span>
                      <span className="text-[13px] text-foreground font-medium">{o.text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handlePreviousQuestion}
                  disabled={currentIndex === 0 || isSubmitting}
                  className="flex-1 h-12 rounded-xl border border-border bg-card hover:bg-accent text-foreground font-display font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={
                    currentIndex === questions.length - 1
                      ? handleFinalSubmit
                      : handleNextQuestion
                  }
                  disabled={!selectedOption || isSubmitting}
                  className="flex-1 h-12 rounded-xl bg-primary text-white font-display font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-primary/95 transition-all"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {currentIndex === questions.length - 1 ? "Submit Quiz" : "Next Question"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </MobileFrame>
  );
}
