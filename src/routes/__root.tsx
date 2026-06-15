import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "ACCA FR Mastery — Financial Reporting Notes & Quizzes" },
      { name: "description", content: "Master ACCA Financial Reporting with curated notes, quizzes, AI doubt-solving and progress tracking." },
      { property: "og:title", content: "ACCA FR Mastery — Financial Reporting Notes & Quizzes" },
      { property: "og:description", content: "Master ACCA Financial Reporting with curated notes, quizzes, AI doubt-solving and progress tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "ACCA FR Mastery — Financial Reporting Notes & Quizzes" },
      { name: "twitter:description", content: "Master ACCA Financial Reporting with curated notes, quizzes, AI doubt-solving and progress tracking." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ad65df27-5f88-4a38-aeab-47b9c30677ce" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ad65df27-5f88-4a38-aeab-47b9c30677ce" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  if ((import.meta.env as any).VITE_SPA) {
    return <>{children}</>;
  }

  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Load PDF.js library globally for native same-page PDF rendering on mobile */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js" defer></script>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <RootComponentInner />
    </AuthProvider>
  );
}

function RootComponentInner() {
  const { queryClient } = Route.useRouteContext();
  const { user, loading, subscriptionStatus, subscriptionLoading } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || subscriptionLoading) return;

    const path = router.state.location.pathname;

    // 1. Auth Guard: Protect all pages except '/' and '/auth'
    if (!user && path !== "/" && path !== "/auth") {
      navigate({ to: "/auth", search: { mode: "login" }, replace: true });
      return;
    }

    // 2. Subscription Guard: Protect main app layout pages if not subscribed
    if (user) {
      const isSubscribed = subscriptionStatus === "active";
      const protectedPaths = [
        "/home",
        "/notes",
        "/quiz",
        "/chat",
        "/discussion",
        "/leaderboard",
        "/progress",
        "/notifications",
        "/profile",
        "/referral",
        "/revision",
        "/tasks",
      ];

      const isTryingToAccessProtected = protectedPaths.some((p) =>
        path.startsWith(p)
      );

      if (!isSubscribed && isTryingToAccessProtected) {
        navigate({ to: "/subscription", replace: true });
      } else if (isSubscribed && path === "/subscription") {
        navigate({ to: "/home", replace: true });
      }
    }
  }, [user, subscriptionStatus, loading, subscriptionLoading, router.state.location.pathname, navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
