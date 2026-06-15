import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ACCA FR Mastery" },
      { name: "description", content: "Master ACCA Financial Reporting with confidence." },
    ],
  }),
  component: Splash,
});

function Splash() {
  return (
    <div className="min-h-screen w-full flex items-start sm:items-center justify-center bg-[#0b1220] sm:py-8">
      <div className="relative w-full sm:w-[390px] sm:h-[844px] sm:rounded-[44px] bg-black sm:p-2 sm:shadow-[0_30px_80px_-20px_rgba(26,86,219,0.35)]">
        <div className="relative w-full h-[100dvh] sm:h-full overflow-hidden sm:rounded-[36px] bg-primary flex flex-col">
          {/* decorative blobs */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-1/3 -left-24 w-64 h-64 rounded-full bg-white/5 blur-3xl" />

          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
            <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center mb-6 ring-1 ring-white/20">
              <GraduationCap size={40} className="text-white" />
            </div>
            <h1 className="font-display font-extrabold text-white text-4xl tracking-tight">
              ACCA FR Mastery
            </h1>
            <p className="mt-3 text-white/80 text-base font-light max-w-[260px]">
              Master ACCA FR with confidence
            </p>
          </div>

          <div className="relative z-10 px-6 pb-10 space-y-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="flex items-center justify-center h-12 rounded-2xl bg-white text-primary font-semibold font-display shadow-lg shadow-black/10"
            >
              Sign Up
            </Link>
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="flex items-center justify-center h-12 rounded-2xl border-2 border-white/80 text-white font-semibold font-display"
            >
              Login
            </Link>
          </div>

          {/* bottom wave */}
          <svg
            className="absolute bottom-0 inset-x-0 text-primary-light/20"
            viewBox="0 0 390 80"
            preserveAspectRatio="none"
            style={{ height: 80 }}
          >
            <path
              d="M0,40 C90,80 180,0 270,30 C330,50 360,30 390,40 L390,80 L0,80 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
