import { supabase } from './supabaseClient';
import { Coupon } from '../types';

/**
 * Validates a coupon code by calling a secure Supabase RPC function.
 * @param code The coupon code to validate.
 * @returns The coupon details if valid, or an object with an error message.
 */
export const validateCoupon = async (code: string): Promise<Coupon & { error?: string }> => {
    const { data, error } = await supabase.rpc('validate_coupon', {
        coupon_code: code,
    });

    if (error) {
        console.error("Error validating coupon:", error);
        throw new Error("Failed to verify coupon. Please try again.");
    }

    return data;
};

/**
 * Increments the usage count of a coupon after a successful purchase.
 * @param code The coupon code that was used.
 */
export const incrementCouponUsage = async (code: string): Promise<void> => {
    const { error } = await supabase.rpc('increment_coupon_usage', {
        coupon_code: code,
    });

    if (error) {
        // Log this error but don't throw to the user, as the payment has already succeeded.
        // This is important for backend monitoring.
        console.error(`CRITICAL: Failed to increment usage for coupon "${code}" after payment.`, error);
    }
};
