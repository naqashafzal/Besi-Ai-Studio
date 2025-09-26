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

// --- Prompt Management ---

/**
 * Uploads an image file to the local server using FormData.
 * @param file The image file to upload.
 * @returns The local URL of the uploaded file.
 */
const uploadImageToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('promptImage', file);

    const response = await fetch('/prompt-images-upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to upload image' }));
        throw new Error(errorData.error || 'Failed to upload image to server.');
    }
    
    const { filePath } = await response.json();
    return filePath;
};

/**
 * Deletes an image file from the local server.
 * @param imageUrl The local URL of the image to delete.
 */
const deleteImageFromServer = async (imageUrl: string): Promise<void> => {
    if (!imageUrl.startsWith('/prompt-images/')) {
        console.warn(`Skipping deletion for non-local image URL: ${imageUrl}`);
        return;
    }

    try {
        const response = await fetch('/prompt-images-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: imageUrl }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Failed to delete image from server: ${imageUrl}`, errorData);
        }
    } catch (error) {
        console.error(`Error during fetch to delete image: ${imageUrl}`, error);
    }
};

/**
 * Fetches all prompt categories and their prompts from Supabase.
 */
export const getPrompts = async (): Promise<PromptCategory[]> => {
    const { data, error } = await supabase
        .from('prompt_categories')
        .select(`
            id,
            title,
            prompts (
                id,
                text,
                image_url
            )
        `)
        .order('title', { ascending: true });

    if (error) {
        console.error("Error fetching prompts from Supabase:", error);
        throw error;
    }

    const categories: PromptCategory[] = data ? data.map(c => ({
        id: c.id,
        title: c.title,
        prompts: (c.prompts || []).map((p: any) => ({ // Add type assertion for safety
            id: p.id,
            text: p.text,
            imageUrl: p.image_url,
        }))
    })) : [];

    return categories;
};

/**
 * Adds a new example prompt to Supabase.
 */
export const addPrompt = async (prompt: { text: string; imageFile: File | null }, categoryTitle: string): Promise<PromptCategory[]> => {
    let imageUrl: string | null = null;
    try {
        if (prompt.imageFile) {
            imageUrl = await uploadImageToServer(prompt.imageFile);
        }

        // Find or create category
        let { data: category, error: findError } = await supabase
            .from('prompt_categories')
            .select('id')
            .eq('title', categoryTitle)
            .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116: "exact one row not found"
            throw findError;
        }

        if (!category) {
            const { data: newCategory, error: createError } = await supabase
                .from('prompt_categories')
                .insert({ title: categoryTitle })
                .select('id')
                .single();
            if (createError) throw createError;
            category = newCategory;
        }

        if (!category) throw new Error("Could not find or create category.");

        // Insert new prompt
        const { error: insertError } = await supabase.from('prompts').insert({
            text: prompt.text,
            image_url: imageUrl,
            category_id: category.id,
        });

        if (insertError) throw insertError;

        return getPrompts(); // Refresh data
    } catch (error) {
        if (imageUrl) await deleteImageFromServer(imageUrl); // Cleanup on failure
        console.error("Error adding prompt:", error);
        throw error;
    }
};

/**
 * Updates an example prompt in Supabase.
 */
export const updatePrompt = async (
    promptId: string,
    updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean },
    originalImageUrl: string | null
): Promise<PromptCategory[]> => {
    let newImageUrl = originalImageUrl;
    
    try {
        if ((updates.removeImage || updates.imageFile) && originalImageUrl) {
            await deleteImageFromServer(originalImageUrl);
        }

        if (updates.removeImage) {
            newImageUrl = null;
        } else if (updates.imageFile) {
            newImageUrl = await uploadImageToServer(updates.imageFile);
        }

        let { data: category, error: findError } = await supabase
            .from('prompt_categories')
            .select('id')
            .eq('title', updates.categoryTitle)
            .single();

        if (findError && findError.code !== 'PGRST116') throw findError;

        if (!category) {
            const { data: newCategory, error: createError } = await supabase
                .from('prompt_categories')
                .insert({ title: updates.categoryTitle })
                .select('id')
                .single();
            if (createError) throw createError;
            category = newCategory;
        }
        if (!category) throw new Error("Could not find or create category.");

        const { error: updateError } = await supabase
            .from('prompts')
            .update({
                text: updates.text,
                image_url: newImageUrl,
                category_id: category.id,
            })
            .eq('id', promptId);

        if (updateError) throw updateError;
        
        return getPrompts();
    } catch (error) {
        console.error("Error updating prompt:", error);
        // Attempting to upload a new image and failing would leave a dangling file.
        // The service doesn't know if the newImageUrl was successfully created here to clean it up.
        // This is a limitation without a more transactional approach.
        throw error;
    }
};

/**
 * Deletes an example prompt from Supabase and its associated image from the server.
 */
export const deletePrompt = async (promptId: string): Promise<PromptCategory[]> => {
    const { data: prompt, error: findError } = await supabase
        .from('prompts')
        .select('image_url')
        .eq('id', promptId)
        .single();

    if (findError && findError.code !== 'PGRST116') {
        console.error("Error finding prompt to delete:", findError);
        throw findError;
    }

    const { error: deleteError } = await supabase.from('prompts').delete().eq('id', promptId);
    
    if (deleteError) {
        console.error("Error deleting prompt from DB:", deleteError);
        throw deleteError;
    }

    if (prompt?.image_url) {
        await deleteImageFromServer(prompt.image_url);
    }
    
    return getPrompts();
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