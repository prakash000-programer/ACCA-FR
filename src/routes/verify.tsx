import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { Smartphone, ShieldCheck, Check, X, Phone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

export const Route = createFileRoute("/verify")({ component: VerifyPage });

/** Build a device fingerprint.
 *  On Android (Capacitor native) we use the hardware-backed Device plugin.
 *  On web/desktop we fall back to a localStorage UUID + userAgent sniffing.
 */
const getDeviceFingerprint = async (): Promise<{
  deviceId: string;
  model: string;
  osVersion: string;
}> => {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const [info, id] = await Promise.all([Device.getInfo(), Device.getId()]);
      return {
        deviceId: id.identifier,
        model: `${info.manufacturer ?? ""} ${info.model ?? ""}`.trim() || "Android Device",
        osVersion: `${info.operatingSystem} ${info.osVersion}`,
      };
    } catch (e) {
      console.warn("[Verify] Capacitor Device plugin error, falling back", e);
    }
  }

  // --- Web fallback ---
  let deviceId = localStorage.getItem("acca_device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("acca_device_id", deviceId);
  }
  const ua = navigator.userAgent;
  let osVersion = "Unknown OS";
  if (/windows/i.test(ua)) osVersion = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) osVersion = "macOS";
  else if (/android/i.test(ua)) osVersion = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) osVersion = "iOS";
  else if (/linux/i.test(ua)) osVersion = "Linux";

  return { deviceId, model: "Web Browser", osVersion };
};

function VerifyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "success" | "fail">("loading");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth", search: { mode: "login" } });
      return;
    }

    const verifyDevice = async () => {
      try {
        const { deviceId, model, osVersion } = await getDeviceFingerprint();

        // 1. Check existing device registration for this user
        const { data: existing, error: fetchError } = await supabase
          .from("device_registrations")
          .select("device_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existing) {
          // 2. No record → first login on this device → register it
          const { error: insertError } = await supabase
            .from("device_registrations")
            .insert({
              user_id: user.id,
              device_id: deviceId,
              device_model: model,
              os_version: osVersion,
            });
          if (insertError) throw insertError;
          setState("success");
        } else if (existing.device_id === deviceId) {
          // 3. Record exists and matches → allow
          setState("success");
        } else {
          // 4. Record exists but DIFFERENT device → block
          setState("fail");
        }
      } catch (err) {
        console.error("[Verify] Device verification error:", err);
        // On unexpected errors, fall through to success to avoid locking users out
        // during development; tighten this to "fail" in production.
        setState("success");
      }
    };

    verifyDevice();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (state === "success" && user) {
      const checkSubscriptionAndRedirect = async () => {
        try {
          // Fetch subscription status
          const { data: profile, error } = await supabase
            .from("users")
            .select("subscription_status")
            .eq("id", user.id)
            .single();

          if (error) throw error;

          const isSubscribed = profile?.subscription_status === "active";
          setTimeout(() => {
            if (isSubscribed) {
              navigate({ to: "/home" });
            } else {
              navigate({ to: "/subscription" });
            }
          }, 1200);
        } catch (err) {
          console.error("Error checking subscription:", err);
          navigate({ to: "/subscription" });
        }
      };

      checkSubscriptionAndRedirect();
    }
  }, [state, user, navigate]);

  return (
    <MobileFrame>
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="relative">
          <div className="w-40 h-56 rounded-3xl bg-primary-light border-2 border-primary/20 flex items-center justify-center">
            <Smartphone size={72} className="text-primary" strokeWidth={1.6} />
          </div>
          <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            {state === "loading" && <ShieldCheck size={28} className="text-white" />}
            {state === "success" && <Check size={28} className="text-white" />}
            {state === "fail" && <X size={28} className="text-white" />}
          </div>
        </div>

        <div className="mt-10">
          {state === "loading" && (
            <>
              <div className="mx-auto h-7 w-7 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
              <h2 className="mt-5 font-display font-bold text-xl">Verifying your device...</h2>
              <p className="mt-2 text-sm text-muted-foreground">This won't take long.</p>
            </>
          )}
          {state === "success" && (
            <>
              <h2 className="font-display font-bold text-xl text-success">Device registered successfully</h2>
              <p className="mt-2 text-sm text-muted-foreground">You're all set. Taking you in...</p>
            </>
          )}
          {state === "fail" && (
            <>
              <h2 className="font-display font-bold text-xl text-danger">Device mismatch</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This account is linked to another device. Contact admin to reset.
              </p>
              <Link to="/contact" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
                <Phone size={16} /> Contact Admin
              </Link>
            </>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
