import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, ListChecks, MessageCircle, User } from "lucide-react";
import { useEffect, useState } from "react";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/notes", label: "Notes", icon: BookOpen },
  { to: "/quiz", label: "Quiz", icon: ListChecks },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        setIsKeyboardOpen(true);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        setIsKeyboardOpen(false);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  if (isKeyboardOpen) return null;

  return (
    <nav className="absolute bottom-0 inset-x-0 bg-card border-t border-border px-2 pt-2 pb-3 sm:rounded-b-[36px]">
      <ul className="flex items-center justify-between">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
          return (
            <li key={to} className="flex-1">
              <Link
                to={to as never}
                className={`flex flex-col items-center gap-1 py-1.5 rounded-xl text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-9 w-12 items-center justify-center rounded-xl transition-colors ${
                    active ? "bg-primary-light" : ""
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
