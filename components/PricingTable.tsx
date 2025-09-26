

import React, { forwardRef, useMemo } from 'react';
import { Plan, Session, UserProfile, PlanCountryPrice } from '../types';
import { CheckIcon, StarIcon } from './Icons';

interface PricingTableProps {
  plans: Plan[];
  session: Session | null;
  profile: UserProfile | null;
  onSelectPlan: (planName: string) => void;
  country?: string | null;
  planCountryPrices: PlanCountryPrice[];
}

const planFeatures: Record<string, string[]> = {
    free: [
        'Standard Access to AI Model',
        'Community Support',
    ],
    pro: [
        'Priority Access to New Features',
        'Faster Generations',
        'Priority Support',
    ]
}

const PricingTable = forwardRef<HTMLElement, PricingTableProps>(({ plans, session, profile, onSelectPlan, country, planCountryPrices }, ref) => {
  
  const displayedPlans = useMemo(() => {
    return plans.map(plan => {
      const planWithCurrency = { ...plan, currency: 'USD' };

      if (plan.price === 0) {
        return planWithCurrency;
      }
      
      const countryPrice = planCountryPrices.find(p => p.plan_id === plan.id && p.country === country);

      if (countryPrice) {
        return {
          ...plan,
          price: countryPrice.price,
          currency: countryPrice.currency,
        };
      }
      
      return planWithCurrency;
    });
  }, [plans, country, planCountryPrices]);
  
  const getButtonText = (plan: Plan): string => {
    const isPro = plan.name === 'pro';
    const isCurrentPlan = profile?.plan === plan.name;

    if (session) { // Logged in user
        if (isCurrentPlan) return 'Your Current Plan';
        if (isPro) return 'Upgrade to Pro';
        return 'Get Plan'; // Fallback
    } else { // Visitor
        return isPro ? 'Sign Up for Pro' : 'Sign Up for Free';
    }
  };

  return (
    <section ref={ref} className="mt-16 py-8 md:py-12 scroll-mt-20">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-text-primary">
          Choose Your Plan
        </h2>
        <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
          Start for free and upgrade to unlock more credits and priority features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {displayedPlans.map((plan) => {
          const isPro = plan.name === 'pro';
          const isCurrentPlan = profile?.plan === plan.name;
          const isUSD = (plan as any).currency === 'USD';
          const hasSalePrice = plan.sale_price != null && plan.sale_price < plan.price;
          const finalPrice = hasSalePrice ? plan.sale_price! : plan.price;

          return (
            <div
              key={plan.id}
              className={`bg-panel rounded-2xl p-6 md:p-8 border ${isPro ? 'border-brand-secondary/50' : 'border-border'} flex flex-col relative`}
            >
              {isPro && (
                 <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-2 px-4 py-1 bg-brand-secondary text-background font-semibold rounded-full text-sm">
                        <StarIcon className="w-4 h-4" />
                        Most Popular
                    </div>
                </div>
              )}
             
              <div className="flex-grow">
                <h3 className={`text-2xl font-bold capitalize ${isPro ? 'text-brand-secondary' : 'text-text-primary'}`}>{plan.name}</h3>
                <p className="text-text-secondary mt-2 h-12">{plan.name === 'free' ? 'For casual users to try things out.' : 'For power users who want the best.'}</p>

                <div className="my-8">
                  <div className="flex items-baseline justify-center md:justify-start gap-2">
                    {hasSalePrice && (
                      <span className="text-3xl font-bold text-text-secondary line-through">
                          {isUSD ? `$${plan.price.toFixed(2)}` : plan.price.toLocaleString()}
                      </span>
                    )}
                    <span className="text-5xl font-extrabold text-text-primary">
                      {isUSD ? `$${finalPrice.toFixed(2)}` : finalPrice.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-text-secondary">{isUSD ? '/month' : ` ${(plan as any).currency}/month`}</span>
                </div>
                
                <ul className="space-y-4 text-text-secondary">
                  <li className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500" />
                    <span className="text-text-primary font-medium">{plan.credits_per_month.toLocaleString()}</span> Monthly Credits
                  </li>
                  {(planFeatures[plan.name] || []).map(feature => (
                     <li key={feature} className="flex items-center gap-3">
                        <CheckIcon className="w-5 h-5 text-green-500" />
                        {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10">
                <button
                  onClick={() => onSelectPlan(plan.name)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 px-4 font-bold rounded-lg transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed ${
                    isPro 
                    ? 'bg-brand-secondary text-background hover:bg-amber-300 disabled:bg-brand-secondary'
                    : 'bg-panel-light text-text-primary hover:bg-border disabled:bg-panel-light'
                  }`}
                >
                  {getButtonText(plan)}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  );
});

export default PricingTable;