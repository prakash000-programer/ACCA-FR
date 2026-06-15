import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Copy, Gift, Share2, Users, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/referral")({ component: ReferralPage });

function ReferralPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [referralsCount, setReferralsCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadReferralData = async () => {
      try {
        setLoading(true);

        // Fetch user profile
        let { data: profile, error } = await supabase
          .from("users")
          .select("referral_code")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        let code = profile?.referral_code;

        // If user has no code yet, generate and save it
        if (!code) {
          code = user.id.split("-")[0].toUpperCase();
          const { error: updateError } = await supabase
            .from("users")
            .update({ referral_code: code })
            .eq("id", user.id);

          if (updateError) {
            console.error("Error generating referral code:", updateError);
          }
        }

        setReferralCode(code || "ACCAFR");

        // Count referrals: other users referred by this code
        if (code) {
          const { count, error: countError } = await supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("referred_by", code);

          if (!countError && count !== null) {
            setReferralsCount(count);
          }
        }
      } catch (err) {
        console.error("Error loading referrals:", err);
      } finally {
        setLoading(false);
      }
    };

    loadReferralData();
  }, [user]);

  const referralLink = `https://accafr.app/r/${referralCode}`;
  const shareText = `Hey! Use my referral code ${referralCode} to get 10% off the ACCA Financial Reporting Mastery app. Let's study and pass together!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ACCA FR Mastery Referral",
          text: shareText,
          url: referralLink,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      handleCopy();
    }
  };

  const handleSocialShare = (platform: "whatsapp" | "twitter") => {
    let url = "";
    if (platform === "whatsapp") {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + referralLink)}`;
    } else if (platform === "twitter") {
      url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`;
    }
    window.open(url, "_blank");
  };

  return (
    <MobileFrame>
      <TopBar title="Invite a Friend" />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 px-5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[13px] text-muted-foreground mt-3">Loading referral details...</p>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-8 space-y-5">
          <div className="rounded-3xl bg-primary text-white p-6 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <Gift size={28} className="text-yellow" />
            <h2 className="mt-3 font-display font-bold text-xl">Share & save together</h2>
            <p className="mt-1 text-sm text-white/80">
              Friends get 10% off, and you unlock revision bonus chapters!
            </p>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your referral link
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={referralLink}
                className="flex-1 h-11 rounded-xl bg-background border border-border px-3 text-sm font-mono text-foreground outline-none"
              />
              <button
                onClick={handleCopy}
                className="h-11 px-4 rounded-xl bg-primary text-white inline-flex items-center gap-1.5 text-xs font-semibold hover:bg-primary/95 active:scale-[0.98] transition-all"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSocialShare("whatsapp")}
                className="h-11 rounded-xl bg-success text-white font-semibold text-xs inline-flex items-center justify-center gap-2 hover:bg-success/95 transition-all"
              >
                <Share2 size={14} /> WhatsApp
              </button>
              <button
                onClick={handleShare}
                className="h-11 rounded-xl bg-card border border-border font-semibold text-xs text-foreground inline-flex items-center justify-center gap-2 hover:bg-accent transition-all"
              >
                <Share2 size={14} /> Share Link
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-success-light border border-success/15 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success text-white flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <p className="font-display font-bold text-sm text-success">
                {referralsCount} {referralsCount === 1 ? "friend" : "friends"} joined
              </p>
              <p className="text-[11px] text-foreground/70">
                {referralsCount >= 5
                  ? "Bonus revision pack unlocked! Check your Revision tab."
                  : `${5 - referralsCount} more to unlock the bonus revision pack.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
