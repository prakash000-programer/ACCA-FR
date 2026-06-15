import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface Props {
  children: ReactNode;
  withTabs?: boolean;
  bg?: string;
}

export function MobileFrame({ children, withTabs = false, bg = "bg-background" }: Props) {
  return (
    <div className="min-h-screen w-full flex items-start sm:items-center justify-center bg-[#0b1220] sm:py-8">
      <div className="relative w-full sm:w-[390px] sm:h-[844px] sm:rounded-[44px] bg-black sm:p-2 sm:shadow-[0_30px_80px_-20px_rgba(26,86,219,0.35)]">
        <div className={`relative w-full h-[100dvh] sm:h-full overflow-hidden sm:rounded-[36px] ${bg}`}>
          {/* status bar spacer */}
          <div className="hidden sm:flex absolute top-0 inset-x-0 h-7 items-center justify-between px-7 text-[11px] font-semibold text-foreground z-50">
            <span>9:41</span>
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-24 h-5 bg-black rounded-full" />
            <span className="flex items-center gap-1">
              <span className="w-4 h-2.5 border border-foreground rounded-[3px] relative">
                <span className="absolute inset-0.5 bg-foreground rounded-[1px]" />
              </span>
            </span>
          </div>
          <div className={`h-full overflow-y-auto no-scrollbar ${withTabs ? "pb-24" : ""} sm:pt-7`}>
            {children}
          </div>
          {withTabs && <BottomNav />}
        </div>
      </div>
    </div>
  );
}
