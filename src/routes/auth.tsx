import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { Mail, Lock, ChevronLeft, ShieldCheck, Gift, User, Phone, School, BookOpen, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const searchSchema = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { mode = "login" } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "otp">("form");

  // Automatically redirect if user logs in (e.g. by clicking email confirmation link)
  useEffect(() => {
    if (user) {
      navigate({ to: "/verify" });
    }
  }, [user, navigate]);
  const [showRef, setShowRef] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [otpCode, setOtpCode] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const handleSubmit = async () => {
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split("@")[0],
              phone_number: phone,
              college: college,
              course: course,
              year_of_study: yearOfStudy,
              referral_code_used: referralCode || null,
            },
          },
        });

        if (error) throw error;

        // If email confirmation is enabled, we need OTP
        if (data.user && !data.session) {
          toast.success("Verification code sent to your email!");
          setStep("otp");
        } else {
          // Direct login (if email confirmation is disabled)
          toast.success("Registered successfully!");
          navigate({ to: "/verify" });
        }
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast.success("Signed in successfully!");
        navigate({ to: "/verify" });
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    const code = otpCode.join("");
    if (code.length < 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });

      if (error) throw error;

      toast.success("Email verified successfully!");
      navigate({ to: "/verify" });
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val: string, index: number) => {
    const newOtp = [...otpCode];
    newOtp[index] = val.slice(-1); // keep last digit
    setOtpCode(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <MobileFrame>
      <div className="px-5 pt-4">
        <Link to="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border">
          <ChevronLeft size={20} />
        </Link>

        <div className="mt-6 mb-6">
          <h1 className="font-display font-bold text-2xl text-foreground">
            {step === "otp" ? "Verify your email" : isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "otp" ? "We sent a 6-digit code to your email." : "Continue your ACCA FR journey."}
          </p>
        </div>

        {step === "form" ? (
          <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
            {isSignup && (
              <>
                <FloatingInput
                  icon={<User size={16} />}
                  label="Full name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <div className="h-4" />
                <FloatingInput
                  icon={<Phone size={16} />}
                  label="Phone number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <div className="h-4" />
                <FloatingInput
                  icon={<School size={16} />}
                  label="College"
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                />
                <div className="h-4" />
                <FloatingInput
                  icon={<BookOpen size={16} />}
                  label="Course"
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                />
                <div className="h-4" />
                <FloatingInput
                  icon={<Calendar size={16} />}
                  label="Year of study (e.g., Year 1)"
                  type="text"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                />
                <div className="h-4" />
              </>
            )}

            <FloatingInput
              icon={<Mail size={16} />}
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="h-4" />
            <FloatingInput
              icon={<Lock size={16} />}
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {isSignup && (
              <div className="mt-4">
                <button
                  onClick={() => setShowRef((v) => !v)}
                  className="text-xs font-medium text-primary inline-flex items-center gap-1"
                >
                  <Gift size={14} /> Have a referral code?
                </button>
                {showRef && (
                  <div className="mt-2">
                    <FloatingInput
                      label="Referral code (optional)"
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-6 w-full h-12 rounded-xl bg-primary text-primary-foreground font-display font-semibold flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : isSignup ? (
                "Create account"
              ) : (
                "Sign In"
              )}
            </button>

            <p className="mt-4 text-[11px] text-muted-foreground text-center leading-relaxed">
              <ShieldCheck size={12} className="inline -mt-0.5 mr-1 text-primary" />
              Your device will be registered on first login.
            </p>

            <div className="mt-5 text-center text-xs text-muted-foreground">
              {isSignup ? "Already have an account? " : "New here? "}
              <Link
                to="/auth"
                search={{ mode: isSignup ? "login" : "signup" }}
                className="text-primary font-semibold"
              >
                {isSignup ? "Sign In" : "Sign Up"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
            <div className="flex justify-between gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  maxLength={1}
                  value={otpCode[i]}
                  onChange={(e) => handleOtpChange(e.target.value, i)}
                  onKeyDown={(e) => handleOtpKeyDown(e, i)}
                  className="w-11 h-12 text-center text-lg font-semibold rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-background"
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Enter the 6-digit confirmation code.
            </p>
            <button
              onClick={handleOtpVerify}
              disabled={loading}
              className="mt-6 w-full h-12 rounded-xl bg-primary text-primary-foreground font-display font-semibold flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                "Verify"
              )}
            </button>
          </div>
        )}
      </div>
    </MobileFrame>
  );
}

function FloatingInput({
  label,
  type,
  icon,
  ...props
}: {
  label: string;
  type: string;
  icon?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      )}
      <input
        type={type}
        placeholder=" "
        {...props}
        className={`peer w-full h-12 rounded-xl border border-border bg-background ${
          icon ? "pl-10" : "pl-4"
        } pr-4 pt-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20`}
      />
      <label
        className={`pointer-events-none absolute peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 ${
          icon ? "left-10 peer-placeholder-shown:left-10" : "left-4 peer-placeholder-shown:left-4"
        } top-1.5 text-[10px] font-medium text-muted-foreground peer-focus:text-primary peer-focus:text-[10px] peer-focus:top-1.5 transition-all`}
      >
        {label}
      </label>
    </div>
  );
}
