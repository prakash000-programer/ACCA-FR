import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { Check, Crown, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/subscription")({ component: SubscriptionPage });

const features = [
  "Full chapter-wise notes (PDF)",
  "Unlimited topic quizzes",
  "AI doubt-solving tutor",
  "Progress tracking & analytics",
  "Quick revision summaries",
  "Priority discussion replies",
];

function SubscriptionPage() {
  const { user, subscriptionStatus, refreshSubscriptionStatus } = useAuth();
  const navigate = useNavigate();


  useEffect(() => {
    if (subscriptionStatus === "active") {
      navigate({ to: "/home" });
    }
  }, [subscriptionStatus, navigate]);

  const handleSimulatedPayment = () => {
    toast.info("UPI Payment Gateway is currently disabled. Please use 'Contact Admin' below to get access.");
  };


  return (
    <MobileFrame>
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <Crown size={16} className="text-yellow animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Unlock Access
          </span>
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground">Choose your plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full access to ACCA FR notes, quizzes, and AI tutor.
        </p>

        <div className="mt-6 rounded-3xl bg-card border border-border p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="font-display font-bold text-lg">FR Complete</h2>
              <p className="text-xs text-muted-foreground">Until next exam window</p>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-extrabold text-primary">₹1,499</div>
              <div className="text-[10px] text-muted-foreground">one-time</div>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-light">
                  <Check size={12} className="text-primary" strokeWidth={3} />
                </span>
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleSimulatedPayment}
            className="mt-6 w-full h-12 rounded-xl bg-primary text-primary-foreground font-display font-semibold flex items-center justify-center gap-2 hover:bg-primary/95 active:scale-[0.98] transition-all"
          >
            Pay via UPI
          </button>
          
          <Link
            to="/contact"
            className="mt-3 w-full h-12 rounded-xl border-2 border-primary text-primary font-display font-semibold inline-flex items-center justify-center gap-2 hover:bg-primary-light transition-colors"
          >
            <Phone size={16} /> Contact Admin
          </Link>
        </div>
      </div>
    </MobileFrame>
  );
}
