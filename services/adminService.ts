import { supabase } from './supabaseClient';
import { UserProfile, Plan, PaymentSettings, PlanCountryPrice, PromptCategory, ContactFormData, Prompt } from '../types';

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
        .single();

    if (error) {
        console.error("Error fetching payment settings:", error);
        // Don't throw if not found, just return null
        if (error.code === 'PGRST116') return null; 
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
 * Converts a File object to a base64 data URL.
 */
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};


/**
 * Fetches all prompt categories and their prompts from the database.
 * This function uses two queries and joins the data in code to be more robust
 * against potential database relation or RLS issues with complex queries.
 */
export const getPrompts = async (): Promise<PromptCategory[]> => {
    // Step 1: Fetch all categories
    const { data: categories, error: categoriesError } = await supabase
        .from('prompt_categories')
        .select('id, title')
        .order('title');

    if (categoriesError) {
        console.error("Error fetching prompt categories:", categoriesError);
        throw categoriesError;
    }
    if (!categories || categories.length === 0) {
        return [];
    }

    // Step 2: Fetch all prompts that belong to these categories
    const categoryIds = categories.map(c => c.id);
    const { data: prompts, error: promptsError } = await supabase
        .from('example_prompts')
        .select('id, text, image_url, category_id')
        .in('category_id', categoryIds);
    
    if (promptsError) {
        console.error("Error fetching example prompts:", promptsError);
        throw promptsError;
    }
    
    // Step 3: Map prompts to their categories
    const promptsByCategoryId = new Map<string, Prompt[]>();
    if (prompts) {
        for (const prompt of prompts) {
            if (!promptsByCategoryId.has(prompt.category_id)) {
                promptsByCategoryId.set(prompt.category_id, []);
            }
            promptsByCategoryId.get(prompt.category_id)!.push({
                id: prompt.id,
                text: prompt.text,
                imageUrl: prompt.image_url,
            });
        }
    }

    // Step 4: Combine data and filter out categories with no prompts
    const result: PromptCategory[] = categories.map(category => ({
        id: category.id,
        title: category.title,
        prompts: promptsByCategoryId.get(category.id) || [],
    })).filter(category => category.prompts.length > 0);

    return result;
};

/**
 * Adds a new example prompt to the database.
 */
export const addPrompt = async (prompt: { text: string; imageFile: File | null }, categoryTitle: string): Promise<PromptCategory[]> => {
    let { data: category } = await supabase
        .from('prompt_categories')
        .select('id')
        .eq('title', categoryTitle)
        .single();

    if (!category) {
        const { data: newCategory, error: newCategoryError } = await supabase
            .from('prompt_categories')
            .insert({ title: categoryTitle })
            .select('id')
            .single();
        if (newCategoryError) throw newCategoryError;
        category = newCategory;
    }
    if (!category) throw new Error("Could not find or create category");

    let imageUrl: string | null = null;
    if (prompt.imageFile) {
        imageUrl = await fileToDataUrl(prompt.imageFile);
    }
    
    await supabase
        .from('example_prompts')
        .insert({
            category_id: category.id,
            text: prompt.text,
            image_url: imageUrl,
        });

    return getPrompts();
};

/**
 * Updates an example prompt in the database.
 */
export const updatePrompt = async (
    promptId: string,
    updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean },
    originalImageUrl: string | null
): Promise<PromptCategory[]> => {
    let { data: category } = await supabase
        .from('prompt_categories')
        .select('id')
        .eq('title', updates.categoryTitle)
        .single();
    if (!category) {
        const { data: newCategory, error: newCategoryError } = await supabase
            .from('prompt_categories')
            .insert({ title: updates.categoryTitle })
            .select('id')
            .single();
        if (newCategoryError) throw newCategoryError;
        category = newCategory;
    }
    if (!category) throw new Error("Could not find or create category");

    let newImageUrl = originalImageUrl;
    if (updates.removeImage) {
        newImageUrl = null;
    } else if (updates.imageFile) {
        newImageUrl = await fileToDataUrl(updates.imageFile);
    }

    await supabase
        .from('example_prompts')
        .update({
            text: updates.text,
            category_id: category.id,
            image_url: newImageUrl,
        })
        .eq('id', promptId);
    
    return getPrompts();
};

/**
 * Deletes an example prompt from the database.
 */
export const deletePrompt = async (promptId: string): Promise<PromptCategory[]> => {
    await supabase
        .from('example_prompts')
        .delete()
        .eq('id', promptId);
    
    // Note: This does not automatically delete empty categories. A cleanup task could handle that.
    
    return getPrompts();
};


/**
 * Submits a contact form message to the database.
 * Requires a 'contact_submissions' table.
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