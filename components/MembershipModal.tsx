import React, { useState, useMemo } from 'react';
import { XMarkIcon, StarIcon, SparklesIcon } from './Icons';
import { Plan, PaymentSettings, UserProfile } from '../types';
import { validateCoupon } from '../services/adminService';

interface MembershipModalProps {
  plan: Plan;
  onClose: () => void;
  onUpgrade: () => Promise<void>;
  country?: string | null;
  paymentSettings: PaymentSettings | null;
  profile: UserProfile | null;
}

const MembershipModal: React.FC<MembershipModalProps> = ({ plan, onClose, onUpgrade, country, paymentSettings, profile }) => {
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState<{ value: number; type: string } | null>(null);
    const [couponMessage, setCouponMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isApplying, setIsApplying] = useState(false);
    const [showCouponInput, setShowCouponInput] = useState(false);

    const isPakistan = country === 'Pakistan';
    const canPayManually = isPakistan && !!paymentSettings?.manual_payment_instructions_pk;
    const canPayWithPayPal = !!paymentSettings?.paypal_client_id;
    const isAdmin = profile?.role === 'admin';

    const handleUpgradeClick = async () => {
        setIsUpgrading(true);
        try {
            await onUpgrade();
        } finally {
            setIsUpgrading(false);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setIsApplying(true);
        setCouponMessage(null);
        try {
            const result = await validateCoupon(couponCode, plan.id);
            if (result.isValid && result.discountValue && result.discountType) {
                setAppliedDiscount({ value: result.discountValue, type: result.discountType });
                setCouponMessage({ text: result.message, type: 'success' });
            } else {
                setAppliedDiscount(null);
                setCouponMessage({ text: result.message, type: 'error' });
            }
        } catch (err) {
            setAppliedDiscount(null);
            setCouponMessage({ text: "An unexpected error occurred.", type: 'error' });
        } finally {
            setIsApplying(false);
        }
    };

    const finalPrice = useMemo(() => {
        if (!appliedDiscount) return plan.price;
        if (appliedDiscount.type === 'percentage') {
            return plan.price * (1 - appliedDiscount.value / 100);
        }
        if (appliedDiscount.type === 'fixed_amount') {
            return Math.max(0, plan.price - appliedDiscount.value);
        }
        return plan.price;
    }, [plan.price, appliedDiscount]);


    const renderPaymentAction = () => {
        const manualPaymentJSX = canPayManually && (
            <>
                <div className="bg-background p-4 rounded-lg border border-border text-sm">
                    <h4 className="font-bold text-text-primary mb-2">Manual Payment Instructions</h4>
                    <p className="text-text-secondary whitespace-pre-wrap">
                        {paymentSettings?.manual_payment_instructions_pk}
                    </p>
                </div>
                <button
                    onClick={handleUpgradeClick}
                    disabled={isUpgrading}
                    className="w-full flex items-center justify-center py-3 px-4 mt-4 bg-brand text-white font-bold rounded-lg shadow-lg hover:bg-brand-hover transition-colors duration-300 disabled:opacity-50"
                >
                    {isUpgrading ? 'Upgrading...' : 'Confirm Payment & Upgrade'}
                </button>
            </>
        );

        const paypalPaymentJSX = canPayWithPayPal && (
            <button
                // NOTE: Full PayPal integration is a separate task. This is a placeholder.
                onClick={() => alert("Redirecting to PayPal...")}
                className="w-full flex items-center justify-center py-3 px-4 bg-[#0070BA] text-white font-bold rounded-lg shadow-lg hover:bg-[#005ea6] transition-colors duration-300"
            >
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M7.348 3.5h9.304c.81 0 1.52.563 1.695 1.352l2.362 10.93c.12 1.05-.9 1.718-1.71 1.718h-4.27c-.84 0-1.583.563-1.737 1.352l-.42 2.36c-.155.79-.81 1.352-1.668 1.352h-2.1c-.555 0-1.02-.375-1.14-.9L4.35 4.852C4.175 4.062 4.915 3.5 5.725 3.5h1.623zM16.8 6.26c-1.47 0-2.618 1.2-2.738 2.672-.142 1.74 1.2 3.188 2.952 3.188 1.71 0 2.95-1.448 3.095-3.188.142-1.47-1.02-2.672-2.768-2.672h-.54z"></path></svg>
                Pay with PayPal
            </button>
        );

        if (manualPaymentJSX && paypalPaymentJSX) {
            return (
                <div className="space-y-4">
                    {paypalPaymentJSX}
                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-panel text-text-secondary">OR</span>
                        </div>
                    </div>
                    {manualPaymentJSX}
                </div>
            );
        }

        if (manualPaymentJSX) return manualPaymentJSX;
        if (paypalPaymentJSX) return paypalPaymentJSX;

        // Fallback if no payment method is available for the user's region
        return (
             <div className="text-center bg-background p-4 rounded-lg border border-border text-sm text-text-secondary">
                {isAdmin && !paymentSettings ? (
                    <p>
                        No payment methods configured. Please go to the{' '}
                        <strong className="text-text-primary">Admin Dashboard &gt; Payments</strong> tab to set up payment providers.
                    </p>
                ) : (
                    <p>No payment method is currently configured for your region. Please contact support for assistance with upgrading your plan.</p>
                )}
             </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-panel rounded-2xl shadow-2xl border border-border w-full max-w-md relative overflow-hidden">
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand to-brand-secondary"></div>
             <button
                onClick={onClose}
                className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close membership modal"
            >
                <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-block p-3 bg-brand-secondary/10 rounded-full">
                        <StarIcon className="w-10 h-10 text-brand-secondary" />
                    </div>
                    <h2 className="text-3xl font-bold text-text-primary">Upgrade to Pro</h2>
                    <p className="text-text-secondary">Unlock your full creative potential.</p>
                </div>

                <div className="bg-background p-6 rounded-lg border border-border space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-brand rounded-full text-white mt-1">
                           <SparklesIcon className="w-4 h-4"/>
                        </div>
                        <div>
                            <h3 className="font-semibold text-text-primary">{plan.credits_per_month.toLocaleString()} Monthly Credits</h3>
                            <p className="text-sm text-text-secondary">Supercharge your creativity with a massive credit boost, renewing every month.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-brand rounded-full text-white mt-1">
                           ✓
                        </div>
                        <div>
                            <h3 className="font-semibold text-text-primary">Priority Access</h3>
                            <p className="text-sm text-text-secondary">Get first access to new features and models as they are released.</p>
                        </div>
                    </div>
                </div>

                 <div className="text-center">
                    {appliedDiscount ? (
                        <p className="text-4xl font-extrabold text-text-primary">
                            <s className="text-2xl text-text-secondary">${plan.price.toFixed(2)}</s> ${finalPrice.toFixed(2)}
                            <span className="text-lg font-medium text-text-secondary">/month</span>
                        </p>
                    ) : (
                        <p className="text-4xl font-extrabold text-text-primary">${plan.price.toFixed(2)}<span className="text-lg font-medium text-text-secondary">/month</span></p>
                    )}
                 </div>
                 
                <div className="my-4">
                    {!showCouponInput ? (
                        <button onClick={() => setShowCouponInput(true)} className="text-sm text-brand hover:underline w-full text-center">
                            Have a coupon code?
                        </button>
                    ) : (
                        <div className="space-y-2 animate-fade-in">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="Enter coupon code"
                                    className="w-full p-2 bg-background border border-border rounded-lg"
                                    disabled={isApplying}
                                />
                                <button onClick={handleApplyCoupon} disabled={isApplying || !couponCode} className="px-4 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                                    {isApplying ? '...' : 'Apply'}
                                </button>
                            </div>
                            {couponMessage && <p className={`text-xs text-center ${couponMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{couponMessage.text}</p>}
                        </div>
                    )}
                </div>

                 {renderPaymentAction()}
            </div>
          </div>
        </div>
    );
};

export default MembershipModal;