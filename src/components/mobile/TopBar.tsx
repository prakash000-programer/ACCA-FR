import { useRouter, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { BackButtonManager } from "@/lib/backButton";

interface Props {
  title: string;
  back?: string;
  right?: ReactNode;
  variant?: "default" | "primary";
}

export function TopBar({ title, back, right, variant = "default" }: Props) {
  const router = useRouter();
  const isPrimary = variant === "primary";
  
  const onBack = () => {
    if (back) router.navigate({ to: back as never });
    else router.history.back();
  };

  // Hook into the native hardware back button
  useEffect(() => {
    const unsubscribe = BackButtonManager.push(() => {
      onBack();
      return true; // handled
    });
    return unsubscribe;
  }, [back]);
  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between px-4 py-3 ${
        isPrimary ? "bg-primary text-white" : "bg-card/95 backdrop-blur border-b border-border"
      }`}
    >
      <button
        onClick={onBack}
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          isPrimary ? "hover:bg-white/10" : "hover:bg-muted"
        }`}
      >
        <ChevronLeft size={20} />
      </button>
      <h1 className={`font-display font-semibold text-[15px] ${isPrimary ? "text-white" : "text-foreground"}`}>
        {title}
      </h1>
      <div className="flex items-center justify-end min-w-9">{right}</div>
    </header>
  );
}

// Keep Link import to avoid breakage if used elsewhere
export { Link };
