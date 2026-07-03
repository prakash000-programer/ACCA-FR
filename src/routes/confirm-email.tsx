import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { ShieldCheck, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/confirm-email")({
  component: ConfirmEmailPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: search.code as string | undefined,
      type: search.type as string | undefined,
    };
  },
});

function ConfirmEmailPage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const verifyCodeAndSession = async () => {
      try {
        // 1. If PKCE authorization code is present in query parameters, exchange it
        if (code) {
          console.log("[Confirm Email] Found PKCE code, exchanging for session...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // 2. Wait briefly to let Supabase Client handle any implicit hash fragments (#access_token=...)
        await new Promise((resolve) => setTimeout(resolve, 800));

        // 3. Retrieve the current active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!active) return;

        if (session && session.user) {
          toast.success("Email verified successfully!");
          setStatus("success");
          
          // Auto redirect to device verification page after 1.5s
          setTimeout(() => {
            if (active) {
              navigate({ to: "/verify", replace: true });
            }
          }, 1500);
        } else {
          // If no active session was found, check if supabase client auth holds user
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setStatus("success");
            setTimeout(() => {
              if (active) {
                navigate({ to: "/verify", replace: true });
              }
            }, 1500);
          } else {
            throw new Error("No active session or valid verification token found.");
          }
        }
      } catch (err: any) {
        console.error("[Confirm Email] Error confirming email:", err);
        if (active) {
          setStatus("error");
          setErrorMessage(err.message || "Invalid or expired email confirmation link.");
        }
      }
    };

    verifyCodeAndSession();

    return () => {
      active = false;
    };
  }, [code, navigate]);

  return (
    <MobileFrame>
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="relative">
          <div className="w-40 h-56 rounded-3xl bg-primary-light border-2 border-primary/20 flex items-center justify-center">
            <ShieldCheck size={72} className="text-primary" strokeWidth={1.6} />
          </div>
          <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            {status === "loading" && <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />}
            {status === "success" && <Check size={28} className="text-white" />}
            {status === "error" && <AlertTriangle size={28} className="text-white" />}
          </div>
        </div>

        <div className="mt-10 max-w-[280px]">
          {status === "loading" && (
            <>
              <h2 className="font-display font-bold text-xl text-foreground animate-pulse">Confirming email...</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Exchanging authentication tokens and validating your session.
              </p>
            </>
          )}
          
          {status === "success" && (
            <>
              <h2 className="font-display font-bold text-xl text-success">Email confirmed!</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Your email has been confirmed successfully. Taking you to device registration...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <h2 className="font-display font-bold text-xl text-danger">Verification Failed</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {errorMessage}
              </p>
              
              <button
                onClick={() => navigate({ to: "/auth", search: { mode: "login" }, replace: true })}
                className="mt-6 w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-all active:scale-95 shadow-md shadow-primary/20"
              >
                Go to Login <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
