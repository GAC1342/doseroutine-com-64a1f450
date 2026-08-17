import { useQuery } from "@tanstack/react-query";
import { getSubscriptionStatus } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

function safeEnv(): "sandbox" | "live" | null {
  try {
    return getStripeEnvironment();
  } catch {
    return null;
  }
}

export function useSubscription() {
  const env = safeEnv();
  return useQuery({
    queryKey: ["subscription", env],
    queryFn: async () => {
      if (!env) {
        return {
          tier: "free" as const,
          isPaid: false,
          isPro: false,
          active: false,
          plan: null,
          status: "free",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        };
      }
      const result = await getSubscriptionStatus({ data: { environment: env } });
      return result;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useIsPaid() {
  const { data } = useSubscription();
  return data?.isPaid && data?.active;
}

export function useIsPro() {
  const { data } = useSubscription();
  return data?.isPro && data?.active;
}
