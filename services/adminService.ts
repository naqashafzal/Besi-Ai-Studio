import { supabase } from './supabaseClient';
import { UserProfile, Plan, PaymentSettings, PlanCountryPrice, PromptCategory, ContactFormData, Prompt, Coupon } from '../types';

/**
 * Fetches all user profiles from the database.
 * Requires admin privileges, enforced by RLS.
 */
export const getUsers = async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
    return data || [];
};

/**
 * Updates a specific user's profile data.
 * Requires admin privileges, enforced by RLS.
 */
export const updateUser = async (userId: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    
    if (error) {
        console.error("Error updating user:", error);
        throw error;
    }
    return data;
};

/**
 * Deletes a user by invoking a Supabase Edge Function.
 * The Edge Function uses the service_role key to bypass RLS and delete from auth schema.
 */
export const deleteUser = async (userId: string): Promise<{ message: string }> => {
    const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
    });

    if (error) {
        console.error("Error deleting user via function:", error);
        throw error;
    }
    return data;
};

/**
 * Fetches all membership plans from the database.
 * Publicly readable.
 */
export const getPlans = async (): Promise<Plan[]> => {
    const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price');

    if (error) {
        console.error("Error fetching plans:", error);
        throw error;
    }
    return data || [];
};

/**
 * Updates a specific membership plan's details.
 * Requires admin privileges, enforced by RLS.
 */
export const updatePlan = async (planId: number, updates: Partial<Plan>): Promise<Plan> => {
     const { data, error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', planId)
        .select()
        .single();

    if (error) {
        console.error("Error updating plan:", error);
        throw error;
    }
    return data;
};

/**
 * Fetches payment provider settings from the database.
 * Requires admin privileges, enforced by RLS.
 */
export const getPaymentSettings = async (): Promise<PaymentSettings | null> => {
    const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .maybeSingle();

    if (error) {
        console.error("Error fetching payment settings:", error);
        throw error;
    }
    return data;
};

/**
 * Updates payment provider settings in the database.
 * Requires admin privileges, enforced by RLS.
 */
export const updatePaymentSettings = async (updates: Partial<PaymentSettings>): Promise<PaymentSettings> => {
    // Upsert the settings. This will create the row if it doesn't exist (id=1), or update it if it does.
    const settingsData = {
        id: 1, // Explicitly set the ID for the upsert operation
        ...updates,
    };

    const { data, error } = await supabase
        .from('payment_settings')
        .upsert(settingsData)
        .select()
        .single();

    if (error) {
        console.error("Error upserting payment settings:", error);
        throw error;
    }
    return data;
};


/**
 * Fetches all country-specific plan prices.
 */
export const getPlanCountryPrices = async (): Promise<PlanCountryPrice[]> => {
    const { data, error } = await supabase.from('plan_country_prices').select('*');
    if (error) {
        console.error("Error fetching plan country prices:", error);
        throw error;
    }
    return data || [];
};

/**
 * Adds a new country-specific plan price.
 */
export const addPlanCountryPrice = async (priceData: Omit<PlanCountryPrice, 'id'>): Promise<PlanCountryPrice> => {
    const { data, error } = await supabase.from('plan_country_prices').insert([priceData]).select().single();
    if (error) {
        console.error("Error adding plan country price:", error);
        throw error;
    }
    return data;
};

/**
 * Updates a country-specific plan price.
 */
export const updatePlanCountryPrice = async (priceId: number, updates: Partial<PlanCountryPrice>): Promise<PlanCountryPrice> => {
    const { data, error } = await supabase.from('plan_country_prices').update(updates).eq('id', priceId).select().single();
    if (error) {
        console.error("Error updating plan country price:", error);
        throw error;
    }
    return data;
};

/**
 * Deletes a country-specific plan price.
 */
export const deletePlanCountryPrice = async (priceId: number): Promise<void> => {
    const { error } = await supabase.from('plan_country_prices').delete().eq('id', priceId);
    if (error) {
        console.error("Error deleting plan country price:", error);
        throw error;
    }
};

// --- Prompt Management (using Supabase) ---

const PROMPT_IMAGE_BUCKET = 'prompt_images';

/**
 * Uploads an image to Supabase Storage.
 * @param imageFile The file to upload.
 * @returns The public URL of the uploaded image.
 */
const uploadImageToSupabase = async (imageFile: File): Promise<string> => {
    const filePath = `public/${Date.now()}-${imageFile.name}`;
    const { error: uploadError } = await supabase.storage
        .from(PROMPT_IMAGE_BUCKET)
        .upload(filePath, imageFile);
    
    if (uploadError) {
        console.error("Error uploading image to Supabase:", uploadError);
        throw new Error('Failed to upload image to storage.');
    }

    const { data } = supabase.storage
        .from(PROMPT_IMAGE_BUCKET)
        .getPublicUrl(filePath);

    if (!data.publicUrl) {
        throw new Error("Could not get public URL for uploaded image.");
    }
    
    return data.publicUrl;
};


/**
 * Deletes an image file from Supabase Storage.
 * @param imageUrl The public URL of the image to delete.
 */
const deleteImageFromSupabase = async (imageUrl: string): Promise<void> => {
    try {
        const url = new URL(imageUrl);
        // Extracts the path after the bucket name, e.g., 'public/12345-image.png'
        const filePath = decodeURIComponent(url.pathname.split(`/${PROMPT_IMAGE_BUCKET}/`)[1]);

        if (!filePath) {
            console.warn(`Could not parse file path from URL: ${imageUrl}`);
            return;
        }

        const { error } = await supabase.storage.from(PROMPT_IMAGE_BUCKET).remove([filePath]);
        if (error && error.message !== 'The resource was not found') {
            console.error(`Error deleting image from Supabase Storage: ${filePath}`, error);
        }
    } catch (e) {
        console.error(`An error occurred while trying to delete image from Supabase: ${imageUrl}`, e);
    }
};

/**
 * Fetches all prompts from the Supabase database and groups them by category.
 */
export const getPrompts = async (): Promise<PromptCategory[]> => {
    const { data, error } = await supabase
        .from('prompts')
        .select('id, text, image_url, category');

    if (error) {
        console.error("Error fetching prompts from Supabase:", error);
        throw new Error('Failed to fetch prompts from database.');
    }

    if (!data) return [];

    const categoriesMap: Map<string, PromptCategory> = new Map();

    data.forEach(prompt => {
        let category = categoriesMap.get(prompt.category);
        if (!category) {
            category = {
                id: `cat-${prompt.category.replace(/\s+/g, '-').toLowerCase()}`,
                title: prompt.category,
                prompts: [],
            };
            categoriesMap.set(prompt.category, category);
        }
        
        category.prompts.push({
            id: prompt.id,
            text: prompt.text,
            imageUrl: prompt.image_url,
        });
    });

    return Array.from(categoriesMap.values()).sort((a, b) => a.title.localeCompare(b.title));
};

/**
 * Adds a new example prompt to the Supabase database.
 */
export const addPrompt = async (prompt: { text: string; imageFile: File | null }, categoryTitle: string): Promise<void> => {
    let imageUrl: string | null = null;
    if (prompt.imageFile) {
        imageUrl = await uploadImageToSupabase(prompt.imageFile);
    }

    const { error } = await supabase.from('prompts').insert({
        text: prompt.text,
        image_url: imageUrl,
        category: categoryTitle,
    });

    if (error) {
        console.error("Error adding prompt to Supabase:", error);
        if(imageUrl) await deleteImageFromSupabase(imageUrl); // Clean up uploaded image on DB failure
        throw new Error('Failed to add prompt.');
    }
};

/**
 * Updates an example prompt in the Supabase database.
 */
export const updatePrompt = async (
    promptId: string,
    updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean },
    originalImageUrl: string | null
): Promise<void> => {
    let newImageUrl = originalImageUrl;

    // Handle image changes
    if (updates.removeImage && originalImageUrl) {
        await deleteImageFromSupabase(originalImageUrl);
        newImageUrl = null;
    } else if (updates.imageFile) {
        newImageUrl = await uploadImageToSupabase(updates.imageFile);
        if (originalImageUrl) {
            await deleteImageFromSupabase(originalImageUrl);
        }
    }

    const { error } = await supabase
        .from('prompts')
        .update({
            text: updates.text,
            category: updates.categoryTitle,
            image_url: newImageUrl,
        })
        .eq('id', promptId);

    if (error) {
        console.error("Error updating prompt in Supabase:", error);
        if (newImageUrl && newImageUrl !== originalImageUrl) {
            await deleteImageFromSupabase(newImageUrl);
        }
        throw new Error('Failed to update prompt.');
    }
};

/**
 * Deletes an example prompt from the Supabase database and its image from storage.
 */
export const deletePrompt = async (promptId: string): Promise<void> => {
    const { data: promptData, error: fetchError } = await supabase
        .from('prompts')
        .select('image_url')
        .eq('id', promptId)
        .single();
    
    if (fetchError) {
        console.error("Error finding prompt to delete:", fetchError);
        throw new Error('Failed to find prompt to delete.');
    }

    const { error: deleteError } = await supabase.from('prompts').delete().eq('id', promptId);
    if (deleteError) {
        console.error("Error deleting prompt from DB:", deleteError);
        throw new Error('Failed to delete prompt.');
    }
    
    if (promptData?.image_url) {
        await deleteImageFromSupabase(promptData.image_url);
    }
};


/**
 * Submits a contact form message to the database.
 */
export const submitContactForm = async (formData: ContactFormData): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const submissionData = {
        name: formData.name || null,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        user_id: session?.user?.id || null,
    };

    const { error } = await supabase.from('contact_submissions').insert([submissionData]);

    if (error) {
        console.error('Error submitting contact form:', error);
        throw new Error('Could not submit your message. Please try again later.');
    }
};

// --- Coupon Management ---

/**
 * Fetches all coupons. Admin only.
 */
export const getCoupons = async (): Promise<Coupon[]> => {
    const { data, error } = await supabase.from('coupons').select('*');
    if (error) {
        console.error("Error fetching coupons:", error);
        throw error;
    }
    return data || [];
};

/**
 * Adds a new coupon. Admin only.
 */
export const addCoupon = async (couponData: Omit<Coupon, 'id' | 'created_at' | 'times_used'>): Promise<Coupon> => {
    const { data, error } = await supabase.from('coupons').insert([couponData]).select().single();
    if (error) {
        console.error("Error adding coupon:", error);
        // Provide more specific error for unique constraint violation
        if (error.code === '23505') {
            throw new Error(`Coupon code "${couponData.code}" already exists.`);
        }
        throw error;
    }
    return data;
};

/**
 * Updates a coupon. Admin only.
 */
export const updateCoupon = async (couponId: number, updates: Partial<Coupon>): Promise<Coupon> => {
    const { data, error } = await supabase.from('coupons').update(updates).eq('id', couponId).select().single();
    if (error) {
        console.error("Error updating coupon:", error);
         if (error.code === '23505') {
            throw new Error(`Coupon code "${updates.code}" already exists.`);
        }
        throw error;
    }
    return data;
};

/**
 * Deletes a coupon. Admin only.
 */
export const deleteCoupon = async (couponId: number): Promise<void> => {
    const { error } = await supabase.from('coupons').delete().eq('id', couponId);
    if (error) {
        console.error("Error deleting coupon:", error);
        throw error;
    }
};