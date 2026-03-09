"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { createCheckoutSession, createPortalSession } from "@/lib/actions/subscriptions";
import { STRIPE_PLANS } from "@/lib/plans";
import { Crown, Zap, Building2, CreditCard, ExternalLink } from "lucide-react";

interface Usage {
  plan: string;
  casesThisMonth: number;
  casesLimit: number;
  reportsThisMonth: number;
  reportsLimit: number;
  activeUsers: number;
  usersLimit: number;
}

interface Props {
  plan: string;
  usage: Usage;
  subscriptionStatus: string;
  hasStripeCustomer: boolean;
}

const planIcons: Record<string, React.ElementType> = {
  SOLO: Zap,
  PROFESSIONAL: Crown,
  AGENCY: Building2,
};

function UsageMeter({ label, current, limit }: { label: string; current: number; limit: number }) {
  const percentage = limit === Infinity ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = limit !== Infinity && current >= limit * 0.8;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-muted">{label}</span>
        <span className={isNearLimit ? "text-warning" : "text-text"}>
          {current} / {limit === Infinity ? "∞" : limit}
        </span>
      </div>
      {limit !== Infinity && (
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isNearLimit ? "bg-warning" : "bg-accent"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {limit === Infinity && (
        <div className="h-2 bg-accent/20 rounded-full" />
      )}
    </div>
  );
}

export function SettingsClient({ plan, usage, subscriptionStatus, hasStripeCustomer }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleUpgrade = (planKey: string) => {
    setSelectedPlan(planKey);
    startTransition(async () => {
      try {
        const { url } = await createCheckoutSession(planKey);
        if (url) window.location.href = url;
      } catch (err) {
        toast("error", (err as Error).message);
        setSelectedPlan(null);
      }
    });
  };

  const handleManageBilling = () => {
    startTransition(async () => {
      try {
        const { url } = await createPortalSession();
        if (url) window.location.href = url;
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const PlanIcon = planIcons[plan] ?? Zap;

  return (
    <>
      {/* Current Plan */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <PlanIcon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">
                {plan} Plan
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={subscriptionStatus === "active" ? "accent" : "default"}>
                  {subscriptionStatus}
                </Badge>
              </div>
            </div>
          </div>
          {hasStripeCustomer && (
            <Button variant="secondary" size="sm" onClick={handleManageBilling} loading={isPending}>
              <CreditCard className="h-4 w-4" />
              Manage Billing
            </Button>
          )}
        </div>

        {/* Usage meters */}
        <div className="space-y-3">
          <UsageMeter label="Cases this month" current={usage.casesThisMonth} limit={usage.casesLimit} />
          <UsageMeter label="AI Reports this month" current={usage.reportsThisMonth} limit={usage.reportsLimit} />
          <UsageMeter label="Team members" current={usage.activeUsers} limit={usage.usersLimit} />
        </div>
      </div>

      {/* Plan cards */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-text mb-4">Upgrade Plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.entries(STRIPE_PLANS) as [string, typeof STRIPE_PLANS.SOLO][]).map(
            ([key, p]) => {
              const isCurrentPlan = key === plan;
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-4 ${
                    isCurrentPlan ? "border-accent bg-accent/5" : "border-border"
                  }`}
                >
                  <h3 className="text-sm font-semibold text-text mb-1">{p.name}</h3>
                  <p className="text-2xl font-bold text-text font-mono mb-3">
                    £{p.price}<span className="text-sm text-text-muted font-normal">/mo</span>
                  </p>
                  {isCurrentPlan ? (
                    <Badge variant="accent">Current Plan</Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleUpgrade(key)}
                      loading={isPending && selectedPlan === key}
                      disabled={isPending}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {plan === "SOLO" || !plan ? "Start Free Trial" : "Upgrade"}
                    </Button>
                  )}
                </div>
              );
            }
          )}
        </div>
        <p className="text-xs text-text-muted mt-3">
          All plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>
    </>
  );
}
