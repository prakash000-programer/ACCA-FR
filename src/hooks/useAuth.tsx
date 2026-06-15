import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionStatus: string | null;
  subscriptionLoading: boolean;
  refreshSubscriptionStatus: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const fetchSubscriptionStatus = async (userId: string) => {
    setSubscriptionLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("subscription_status")
        .eq("id", userId)
        .single();
      if (data) {
        setSubscriptionStatus(data.subscription_status);
      } else {
        console.error("Error fetching user profile:", error);
      }
    } catch (err) {
      console.error("Error in fetchSubscriptionStatus:", err);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error("Error getting session:", err);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus(user.id);
    } else {
      setSubscriptionStatus(null);
      setSubscriptionLoading(false);
    }
  }, [user]);

  const refreshSubscriptionStatus = async () => {
    if (user) {
      await fetchSubscriptionStatus(user.id);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        subscriptionStatus,
        subscriptionLoading,
        refreshSubscriptionStatus,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
