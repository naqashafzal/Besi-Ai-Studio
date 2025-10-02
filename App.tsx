

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GenerationState, GenerativePart, PromptCategory, Prompt, Session, UserProfile, VisitorProfile, Plan, PaymentSettings, PlanCountryPrice, ContactFormData, ChatMessage, Coupon, CreditCostSettings, DecadeGeneration, GraphicSuiteTool, ArchitectureSuiteTool } from './types';
import { generateImage, generateMultiPersonImage, generatePromptFromImage, createChat, generateVideo, generateSceneDescriptionFromImage, restoreImage, editImage, generateGraphic, upscaleImage, removeBackground, replaceBackground, colorizeGraphic, generateArchitectureImage } from './services/geminiService';
import * as adminService from './services/adminService';
import * as couponService from './services/couponService';
import { supabase } from './services/supabaseClient';
import { DEFAULT_PLANS, VIDEO_LOADING_MESSAGES } from './constants';
import { SparklesIcon, PhotoIcon, UsersIcon, StarIcon, MailIcon, XMarkIcon, ChatBubbleLeftRightIcon, VideoCameraIcon, RefreshIcon, WandIcon, PaintBrushIcon, UserCircleIcon, ClockRewindIcon, CubeTransparentIcon, VectorSquareIcon, DownloadIcon, ArrowsPointingOutIcon, ScissorsIcon, GlobeAltIcon, SwatchIcon, HomeModernIcon } from './components/Icons';
import LoadingIndicator from './components/LoadingIndicator';
import ImageDisplay from './components/ImageDisplay';
import ImageUploader from './components/ImageUploader';
import AdminPanel from './components/AdminPanel';
import Auth from './components/Auth';
import MembershipModal from './components/MembershipModal';
import PricingTable from './components/PricingTable';
import Header from './components/Header';
import Footer from './components/Footer';
import ChatBox from './components/ChatBox';
import VideoPlayer from './components/VideoPlayer';
import HistoryDisplay from './components/HistoryDisplay';
import PastForwardGrid from './components/PastForwardGrid';
import { Chat } from '@google/genai';
import { fileToGenerativePart, dataUrlToFile } from './utils/fileHelpers';
import { createAlbum } from './utils/albumUtils';
import ContactModal from './components/ContactModal';
import AdvancedEditor from './components/AdvancedEditor';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';


const SceneBuilderButton = ({ label, value, currentValue, onClick, disabled = false }: { label: string, value: string, currentValue: string, onClick: (value: string) => void, disabled?: boolean }) => (
    <button
        type="button"
        onClick={() => onClick(value)}
        disabled={disabled}
        className={`w-full text-center p-2 rounded-md border text-xs font-medium transition-colors duration-200 disabled:opacity-50 ${
            currentValue === value
            ? 'bg-brand/20 border-brand text-brand'
            : 'bg-panel-light border-border text-text-secondary hover:border-brand/50 hover:text-text-primary'
        }`}
    >
        {label}
    </button>
);

const AssetTypeButton = ({ label, value, currentValue, onClick, disabled = false }: { label: string, value: string, currentValue: string, onClick: (value: any) => void, disabled?: boolean }) => (
    <button
        type="button"
        onClick={() => onClick(value)}
        disabled={disabled}
        className={`w-full text-center py-2 rounded-md border text-sm font-medium transition-colors duration-200 disabled:opacity-50 ${
            currentValue === value
            ? 'bg-brand text-white shadow'
            : 'bg-panel-light border-border text-text-secondary hover:bg-border'
        }`}
    >
        {label}
    </button>
);

const RestoreOption = ({ id, label, description, checked, onChange, disabled, isProFeature = false }: { id: string, label: string, description: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, disabled: boolean, isProFeature?: boolean }) => (
    <div className="relative flex items-start">
        <div className="flex h-6 items-center">
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="h-4 w-4 rounded border-border bg-background text-brand focus:ring-brand disabled:opacity-50"
            />
        </div>
        <div className="ml-3 text-sm leading-6">
            <label htmlFor={id} className="font-medium text-text-primary flex items-center gap-2">
                {label}
                {isProFeature && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-secondary text-background font-bold rounded-full text-[10px] leading-none">
                        <StarIcon className="w-2.5 h-2.5" />
                        PRO
                    </span>
                )}
            </label>
            <p className="text-text-secondary">{description}</p>
        </div>
    </div>
);


const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [generationState, setGenerationState] = useState<GenerationState>(GenerationState.IDLE);
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[] | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // App Entry State
  const [appLaunched, setAppLaunched] = useState(false);

  // Auth & Profile state
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [visitorProfile, setVisitorProfile] = useState<VisitorProfile | null>(null);
  const [authModalView, setAuthModalView] = useState<'sign_in' | 'sign_up' | null>(null);
  const [selectedPlanForSignup, setSelectedPlanForSignup] = useState<string | null>(null);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isMembershipPromoOpen, setIsMembershipPromoOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planCountryPrices, setPlanCountryPrices] = useState<PlanCountryPrice[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Generation Mode
  const [generationMode, setGenerationMode] = useState<'single' | 'multi' | 'video' | 'past_forward' | 'restore' | 'graphic_suite' | 'architecture_suite'>('single');
  const [generationFidelity, setGenerationFidelity] = useState<'creative' | 'fidelity'>('creative');
  const [useCannyEdges, setUseCannyEdges] = useState<boolean>(false);
  
  // Image states
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [uploadedImageTwo, setUploadedImageTwo] = useState<File | null>(null);
  const [imageDataUrlTwo, setImageDataUrlTwo] = useState<string | null>(null);
  const [styleReferenceImage, setStyleReferenceImage] = useState<File | null>(null);
  const [styleReferenceImageDataUrl, setStyleReferenceImageDataUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<'1024' | '2048'>('1024');
  const [useStrictSizing, setUseStrictSizing] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');

  // Multi-person scene builder state
  const [multiPersonPlacement, setMultiPersonPlacement] = useState<string>('side-by-side');
  const [multiPersonInteraction, setMultiPersonInteraction] = useState<string>('neutral');
  const [sceneDescription, setSceneDescription] = useState<string>('');
  const [isGeneratingScene, setIsGeneratingScene] = useState(false);

  // Video states
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [videoMotionLevel, setVideoMotionLevel] = useState<number>(5);
  const [videoSeed, setVideoSeed] = useState<number>(0);
  
  // "Photo to Prompt" feature states
  const [promptGenImage, setPromptGenImage] = useState<File | null>(null);
  const [promptGenImageDataUrl, setPromptGenImageDataUrl] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptFocus, setPromptFocus] = useState({
    pose: true,
    realism: true,
    style: true,
    background: true,
    clothing: true,
    lighting: true,
    dimension: true,
  });
  const allPromptFocusSelected = Object.values(promptFocus).every(Boolean);
  const somePromptFocusSelected = Object.values(promptFocus).some(Boolean) && !allPromptFocusSelected;

  const [promptKeywords, setPromptKeywords] = useState('');


  // Prompt examples state
  const [examplePrompts, setExamplePrompts] = useState<PromptCategory[]>([]);
  const [promptsLoading, setPromptsLoading] = useState<boolean>(true);
  const [promptSearch, setPromptSearch] = useState('');
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Admin panel state
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [creditCostSettings, setCreditCostSettings] = useState<CreditCostSettings | null>(null);
  const pricingTableRef = useRef<HTMLElement>(null);

  // Queue system state for visitors
  const [isSystemBusy, setIsSystemBusy] = useState<boolean>(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [visitorId, setVisitorId] = useState<string>('');

  // Contact modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // History state
  const [historyImageUrls, setHistoryImageUrls] = useState<string[]>([]);
  
  // Past Forward state
  const DECADES = ['1920s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s', '2030s'];
  const [decadeGenerations, setDecadeGenerations] = useState<Record<string, DecadeGeneration>>({});
  const [selectedDecades, setSelectedDecades] = useState<string[]>(DECADES);
  const [isGeneratingDecades, setIsGeneratingDecades] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<'jpeg' | 'png' | null>(null);

  // Restore state
  const [restoreOptions, setRestoreOptions] = useState({
    upscale: false,
    removeScratches: true,
    colorize: false,
    enhanceFaces: true,
  });

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorHistory, setEditorHistory] = useState<string[]>([]);

  // Graphic Suite State
  const [graphicSuiteTool, setGraphicSuiteTool] = useState<GraphicSuiteTool>('asset_generator');
  const [assetGeneratorTool, setAssetGeneratorTool] = useState<'illustration' | 'icon' | 'pattern'>('illustration');
  const [graphicPrompt, setGraphicPrompt] = useState('');
  const [graphicStyle, setGraphicStyle] = useState('Flat');
  const [graphicCount, setGraphicCount] = useState(4);
  const [generatedSvgs, setGeneratedSvgs] = useState<string[] | null>(null);
  const [graphicImage, setGraphicImage] = useState<File | null>(null);
  const [graphicImageDataUrl, setGraphicImageDataUrl] = useState<string | null>(null);
  const [replaceBackgroundPrompt, setReplaceBackgroundPrompt] = useState('');
  const [logoStyle, setLogoStyle] = useState('Minimalist');
  const [logoColorPalette, setLogoColorPalette] = useState('');
  const [logoNegativePrompt, setLogoNegativePrompt] = useState('');

  // Architecture Suite State
  const [architectureSuiteTool, setArchitectureSuiteTool] = useState<ArchitectureSuiteTool>('exterior');
  const [architecturePrompt, setArchitecturePrompt] = useState('');
  const [architectureImage, setArchitectureImage] = useState<File | null>(null);
  const [architectureImageDataUrl, setArchitectureImageDataUrl] = useState<string | null>(null);

  // UI State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [initialScrollTarget, setInitialScrollTarget] = useState<'pricing' | null>(null);

  const handleGoToPricing = () => {
    setInitialScrollTarget('pricing');
    setAppLaunched(false);
  };


  // --- Credit Costs ---
  const DEFAULT_CREDIT_COSTS: CreditCostSettings = {
    id: 1,
    standard_image: 10,
    hd_image: 20,
    prompt_from_image: 2,
    chat_message: 1,
    video_generation: 250,
    image_restore: 15,
    image_edit: 20,
    graphic_icon: 5,
    graphic_illustration: 8,
    graphic_logo_maker: 15,
    graphic_pattern: 10,
    graphic_upscale: 15,
    graphic_remove_background: 5,
    graphic_replace_background: 10,
    graphic_colorize: 10,
    architecture_exterior: 25,
    architecture_interior: 25,
    architecture_landscape: 25,
  };

  const getCost = (feature: keyof Omit<CreditCostSettings, 'id'>): number => {
    return creditCostSettings?.[feature] ?? DEFAULT_CREDIT_COSTS[feature];
  };

  // Auth Effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) { // User logged out, reset user profile
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Visitor ID Effect
  useEffect(() => {
    if (!session) {
        let id = sessionStorage.getItem('visitorId');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15);
            sessionStorage.setItem('visitorId', id);
        }
        setVisitorId(id);
    } else {
        // Clear visitorId when user logs in
        sessionStorage.removeItem('visitorId');
        setVisitorId('');
        // If the visitor was in the queue, remove them
        if (visitorId) {
            setQueue(q => q.filter(id => id !== visitorId));
        }
    }
  }, [session, visitorId]);
  
  // Visitor Profile Effect
  useEffect(() => {
    if (session) {
      setVisitorProfile(null); // Clear visitor profile when logged in
      return;
    }
    
    try {
        const storedVisitor = localStorage.getItem('visitorProfile');
        const today = new Date().toISOString().split('T')[0];
        let currentVisitor: VisitorProfile;

        if (storedVisitor) {
            currentVisitor = JSON.parse(storedVisitor);
            if (currentVisitor.lastVisitDate !== today) {
                // New day, reset credits
                currentVisitor = { credits: 10, lastVisitDate: today };
            }
        } else {
            // First time visitor
            currentVisitor = { credits: 10, lastVisitDate: today };
        }
        setVisitorProfile(currentVisitor);
        localStorage.setItem('visitorProfile', JSON.stringify(currentVisitor));
    } catch (e) {
        console.error("Failed to manage visitor profile:", e);
        setVisitorProfile({ credits: 10, lastVisitDate: new Date().toISOString().split('T')[0] });
    }
  }, [session]);

  const updateUserCredits = (newCredits: number) => {
    if (session && profile) {
      const newProfile = { ...profile, credits: newCredits };
      setProfile(newProfile);
    } else if (visitorProfile) {
      const newVisitorProfile = { ...visitorProfile, credits: newCredits };
      setVisitorProfile(newVisitorProfile);
      localStorage.setItem('visitorProfile', JSON.stringify(newVisitorProfile));
    }
  };

  const deductCredits = useCallback(async (amount: number): Promise<boolean> => {
    const current = session ? profile?.credits : visitorProfile?.credits;
    if ((current ?? 0) < amount) {
        setError("You don't have enough credits.");
        if (!session) handleGoToPricing();
        return false;
    }

    const newCredits = (current ?? 0) - amount;

    if (session && profile) {
        const { data, error: updateError } = await supabase
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', session.user.id)
            .select()
            .single();
        
        if (updateError) {
            console.error("Error deducting credits:", updateError);
            setError("Could not update your credits. Please try again.");
            return false;
        }
        if (data) setProfile(p => p ? { ...p, credits: data.credits } : null);

    } else {
        // For visitors, just update local state
        updateUserCredits(newCredits);
    }
    return true;
  }, [session, profile, visitorProfile]);

  // Queue Processing Effect for Visitors
  useEffect(() => {
    if (isSystemBusy || queue.length === 0 || !visitorId) {
        return;
    }

    const processQueue = async () => {
        setIsSystemBusy(true);
        const nextInQueueId = queue[0];
        const cost = getCost('standard_image');

        if (nextInQueueId === visitorId && uploadedImage && prompt) {
            // It's this user's turn
            setGenerationState(GenerationState.LOADING);
            setError(null);
            setGeneratedImageUrls(null);
            
            try {
                // Visitor credit check is done before joining the queue, but we do the deduction here.
                const success = await deductCredits(cost);
                if (!success) { // Double-check in case credits changed
                    setQueue(q => q.slice(1));
                    setIsSystemBusy(false);
                    return;
                }

                const baseImagePart = await fileToGenerativePart(uploadedImage);
                // Visitors only get creative mode and standard options
                const imageUrls = await generateImage(prompt, baseImagePart, '1024', '1:1', 'creative');
                setGeneratedImageUrls(imageUrls);
                setGenerationState(GenerationState.SUCCESS);
                setHistoryImageUrls(prev => [...imageUrls, ...prev]);

            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred during image generation.');
                setGenerationState(GenerationState.ERROR);
                // Refund credits on failure
                updateUserCredits((visitorProfile?.credits ?? 0) + cost);
            } finally {
                setQueue(q => q.slice(1));
                setIsSystemBusy(false);
            }
        } else if (nextInQueueId !== visitorId) {
            // Simulate another user's generation
            const randomProcessingTime = 8000 + Math.random() * 7000; // 8-15 seconds
            setTimeout(() => {
                setQueue(q => q.slice(1));
                setIsSystemBusy(false);
            }, randomProcessingTime);
        } else {
             // This case handles if it's our turn but we don't have an image/prompt
             // It's a failsafe to prevent getting stuck
            setQueue(q => q.slice(1));
            setIsSystemBusy(false);
        }
    };

    processQueue();
  }, [queue, isSystemBusy, visitorId, uploadedImage, prompt, visitorProfile, deductCredits]);


  // Fetch Plans & Settings Effect
  useEffect(() => {
    const fetchSharedData = async () => {
        try {
            const [fetchedPlans, settings, countryPrices, creditCosts] = await Promise.all([
                adminService.getPlans(),
                adminService.getPaymentSettings(),
                adminService.getPlanCountryPrices(),
                adminService.getCreditCostSettings()
            ]);
            // Use fetched plans if available, otherwise use defaults as a fallback
            if (fetchedPlans && fetchedPlans.length > 0) {
                setPlans(fetchedPlans);
            } else {
                console.warn("No plans found in the database. Using default plan data.");
                setPlans(DEFAULT_PLANS);
            }
            setPaymentSettings(settings);
            setPlanCountryPrices(countryPrices || []);
            setCreditCostSettings(creditCosts);
        } catch (error) {
            console.error("Error fetching shared data (plans, settings, costs):", error);
            // On failure, use default plans to ensure the UI is still functional
            setPlans(DEFAULT_PLANS);
        }
    };
    fetchSharedData();
  }, []);

  // Profile & Credits Effect
  useEffect(() => {
    const getProfile = async () => {
      if (!session?.user) {
        setProfile(null);
        return;
      }

      // Helper to fetch profile, will be used for initial fetch and retry
      const fetchUserProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, credits, plan, role, credits_reset_at, phone, country')
          .eq('id', session.user.id)
          .maybeSingle();
        if (error) {
          console.error('Error fetching profile:', error);
        }
        return { data, error };
      };

      // 1. Try to fetch the profile
      let { data: existingProfile, error: fetchError } = await fetchUserProfile();

      if (fetchError) {
          setError("A problem occurred while loading your profile. Please refresh the page.");
          setProfile(null);
          return;
      }

      // 2. If not found, retry after a delay (for DB trigger replication)
      if (!existingProfile) {
        console.warn("Profile not found for user. Retrying after a delay...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { data: retriedProfile, error: retryError } = await fetchUserProfile();
        
        if (retryError) {
            setError("A problem occurred while loading your profile. Please refresh the page.");
            setProfile(null);
            return;
        }
        existingProfile = retriedProfile;
      }

      // 3. Process the profile if it exists, otherwise show an error
      if (existingProfile) {
        // 4. Check for credit renewal for PRO users
        if (existingProfile.plan === 'pro' && existingProfile.credits_reset_at) {
          const lastReset = new Date(existingProfile.credits_reset_at);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          if (lastReset < thirtyDaysAgo) {
            const planDetails = plans.find(p => p.name === 'pro');
            const creditsToSet = planDetails ? planDetails.credits_per_month : 2500;
            
            const { data: updatedProfile, error: updateError } = await supabase
              .from('profiles')
              .update({ credits: creditsToSet, credits_reset_at: new Date().toISOString() })
              .eq('id', session.user.id)
              .select('id, email, credits, plan, role, credits_reset_at, phone, country')
              .single();

            if (updateError) {
              console.error("Error renewing credits:", updateError);
              setProfile(existingProfile); // On error, use the stale profile data
            } else {
              setProfile(updatedProfile); 
            }
            return; // Finished
          }
        }
        // If not a pro user needing renewal, just set the existing profile
        setProfile(existingProfile);

      } else {
        // 5. Profile still doesn't exist. The DB trigger likely failed.
        console.error("Fatal: Profile could not be found after retry. The database trigger may be misconfigured or has failed.");
        setError("Your user account could not be initialized correctly. Please contact support for assistance.");
        setProfile(null);
      }
    };

    if (session && plans.length > 0) {
      getProfile();
    } else if (!session) {
      setProfile(null); // Clear profile on logout
    }
  }, [session, plans]);

  // Effect to trigger upgrade modal after signup if Pro was selected
  useEffect(() => {
    if (profile && profile.plan === 'free' && selectedPlanForSignup === 'pro') {
        setIsMembershipModalOpen(true);
        setSelectedPlanForSignup(null);
    }
  }, [profile, selectedPlanForSignup]);
  
  const handleModeChange = useCallback((mode: 'single' | 'multi' | 'video' | 'past_forward' | 'restore' | 'graphic_suite' | 'architecture_suite') => {
    setGenerationMode(mode);
    setGeneratedImageUrls(null);
    setGeneratedVideoUrl(null);
    setGeneratedSvgs(null);
    setGenerationState(GenerationState.IDLE);
    setError(null);
  }, []);

  const handleGraphicToolChange = useCallback((tool: GraphicSuiteTool) => {
    if (tool === 'logo_maker' && (!session || profile?.plan !== 'pro')) {
        setError('Logo Maker is a Pro feature. Please sign up or upgrade to use it.');
        if (session) {
            setIsMembershipModalOpen(true);
        } else {
            handleGoToPricing();
        }
        return;
    }

    if (generationMode !== 'graphic_suite') {
      handleModeChange('graphic_suite');
    }
    setGraphicSuiteTool(tool);
    setAssetGeneratorTool('illustration'); // Reset sub-tool when changing main tool
  }, [generationMode, handleModeChange, session, profile]);

  const handleArchitectureToolChange = useCallback((tool: ArchitectureSuiteTool) => {
    if (generationMode !== 'architecture_suite') {
      handleModeChange('architecture_suite');
    }
    setArchitectureSuiteTool(tool);
  }, [generationMode, handleModeChange]);
  
  // Reset premium/admin features if user plan/role changes or they log out
  useEffect(() => {
    const canUsePro = session && profile?.plan === 'pro';
    const canUseAdmin = session && profile?.role === 'admin';

    if (!canUsePro) {
        if (aspectRatio !== '1:1') setAspectRatio('1:1');
        if (imageSize !== '1024') setImageSize('1024');
    }

    if (!canUseAdmin && generationMode === 'video') {
        handleModeChange('single');
    }
  }, [profile, session, generationMode, handleModeChange, aspectRatio, imageSize]);

  const handleUpgradeToPro = useCallback(async (couponCode?: string) => {
    if (!session?.user) return;
    const proPlan = plans.find(p => p.name === 'pro');
    if (!proPlan) {
        setError("Pro plan details not available. Please try again later.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ 
                plan: 'pro', 
                credits: (profile?.credits ?? 0) + proPlan.credits_per_month, 
                credits_reset_at: new Date().toISOString() 
            })
            .eq('id', session.user.id)
            .select('id, email, credits, plan, role, credits_reset_at, phone, country')
            .single();

        if (error) throw error;
        
        if (couponCode) {
            await couponService.incrementCouponUsage(couponCode);
        }
        
        if (data) {
            setProfile(data);
            setIsMembershipModalOpen(false);
            setIsMembershipPromoOpen(false);
        }
    } catch (err) {
        console.error("Error upgrading to pro:", err);
        setError("Could not complete upgrade. Please try again.");
    }
  }, [session, plans, profile]);

  // PayPal Success Handler
  useEffect(() => {
    const handlePaypalSuccess = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('paypal_success') === 'true' && session) {
            const plan = urlParams.get('plan');
            const coupon = urlParams.get('coupon');
            if (plan === 'pro') {
                await handleUpgradeToPro(coupon || undefined);
            }
            // Clean URL
            const newUrl = `${window.location.pathname}`;
            window.history.replaceState({}, '', newUrl);
        }
    };
    if (session) {
      handlePaypalSuccess();
    }
}, [session, handleUpgradeToPro]);
  
  const fetchPrompts = useCallback(async () => {
    setPromptsLoading(true);
    try {
      const promptsFromDb = await adminService.getPrompts();
      setExamplePrompts(promptsFromDb);
      // Set initial category if not already set
      if (promptsFromDb && promptsFromDb.length > 0 && !selectedCategory) {
        setSelectedCategory(promptsFromDb[0].title);
      } else if (promptsFromDb.length === 0) {
        setSelectedCategory('');
      }
    } catch (error) {
      console.error("Failed to fetch example prompts:", error);
      setError("Could not load example prompts. Please check your connection and try again.");
    } finally {
      setPromptsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.key === 'a') {
        if (profile?.role === 'admin') {
          event.preventDefault();
          setIsAdminPanelOpen(prev => !prev);
        }
      }
       if (event.key === 'Escape') {
        if (isChatOpen) setIsChatOpen(false);
        if (isAdminPanelOpen) setIsAdminPanelOpen(false);
        if (isContactModalOpen) setIsContactModalOpen(false);
        if (isMembershipModalOpen) setIsMembershipModalOpen(false);
        if (isMembershipPromoOpen) setIsMembershipPromoOpen(false);
        if (authModalView) setAuthModalView(null);
        if (isEditorOpen) setIsEditorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile, isChatOpen, isAdminPanelOpen, isContactModalOpen, isMembershipModalOpen, isMembershipPromoOpen, authModalView, isEditorOpen]);
  
  // Admin Data Fetching
  useEffect(() => {
    const fetchAdminData = async () => {
        if (isAdminPanelOpen && profile?.role === 'admin') {
            try {
                const [users, fetchedCoupons] = await Promise.all([
                    adminService.getUsers(),
                    adminService.getCoupons()
                ]);
                setAllUsers(users);
                setCoupons(fetchedCoupons);
                // Plans, prices, costs and settings are already fetched globally
            } catch (error) {
                console.error("Error fetching admin data:", error);
                setError("Could not load administrator data.");
            }
        }
    };
    fetchAdminData();
  }, [isAdminPanelOpen, profile?.role]);
  
  // Initialize Past Forward state when mode changes
  useEffect(() => {
    if (generationMode === 'past_forward') {
        const initialGenerations: Record<string, DecadeGeneration> = {};
        DECADES.forEach(decade => {
            initialGenerations[decade] = { status: 'idle', url: null };
        });
        setDecadeGenerations(initialGenerations);
    } else {
        setDecadeGenerations({});
    }
  }, [generationMode]);


  const handleImageChange = (file: File | null) => {
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImageDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setUploadedImage(null);
      setImageDataUrl(null);
    }
  };

  const handleImageTwoChange = (file: File | null) => {
    if (file) {
        setUploadedImageTwo(file);
        const reader = new FileReader();
        reader.onload = (e) => setImageDataUrlTwo(e.target?.result as string);
        reader.readAsDataURL(file);
    } else {
        setUploadedImageTwo(null);
        setImageDataUrlTwo(null);
    }
  };

  const handleStyleReferenceImageChange = (file: File | null) => {
    if (file) {
        setStyleReferenceImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setStyleReferenceImageDataUrl(e.target?.result as string);
        reader.readAsDataURL(file);
    } else {
        setStyleReferenceImage(null);
        setStyleReferenceImageDataUrl(null);
    }
  };

  const handlePromptGenImageChange = (file: File | null) => {
    if (file) {
      setPromptGenImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setPromptGenImageDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPromptGenImage(null);
      setPromptGenImageDataUrl(null);
    }
  };

  const handleGraphicImageChange = (file: File | null) => {
    if (file) {
      setGraphicImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setGraphicImageDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
       if (generationMode === 'graphic_suite' && graphicSuiteTool === 'photo_editor') {
          if (!session) {
            setError("Image editing is for logged-in users only.");
            handleGoToPricing();
            return;
          }
          setEditorHistory([]); // Reset history for new image
          setIsEditorOpen(true);
       }
    } else {
      setGraphicImage(null);
      setGraphicImageDataUrl(null);
    }
  };

  const handleArchitectureImageChange = (file: File | null) => {
    if (file) {
      setArchitectureImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setArchitectureImageDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setArchitectureImage(null);
      setArchitectureImageDataUrl(null);
    }
  };
  
  const selectAllPromptFocusRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllPromptFocusRef.current) {
        selectAllPromptFocusRef.current.checked = allPromptFocusSelected;
        selectAllPromptFocusRef.current.indeterminate = somePromptFocusSelected;
    }
  }, [allPromptFocusSelected, somePromptFocusSelected]);
  
  const handleSelectAllPromptFocus = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setPromptFocus({
        pose: isChecked,
        realism: isChecked,
        style: isChecked,
        background: isChecked,
        clothing: isChecked,
        lighting: isChecked,
        dimension: isChecked,
    });
  };

  const currentCredits = session ? profile?.credits : visitorProfile?.credits;
  
  const handleGeneratePromptFromImage = async () => {
    if (!promptGenImage) {
        setError("Please upload an image to generate a prompt from.");
        return;
    }
    const cost = getCost('prompt_from_image');
    const canProceed = await deductCredits(cost);
    if (!canProceed) return;

    setIsGeneratingPrompt(true);
    setError(null);
    try {
        const imagePart = await fileToGenerativePart(promptGenImage);
        const generatedPrompt = await generatePromptFromImage(imagePart, promptFocus, promptKeywords);
        setPrompt(generatedPrompt);
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during prompt generation.');
        // Refund credits on failure
        updateUserCredits((currentCredits ?? 0) + cost);
    } finally {
        setIsGeneratingPrompt(false);
    }
  };

  const handleGenerateImage = useCallback(async () => {
    if (imageSize === '2048' && (!session || profile?.plan !== 'pro')) {
        setError('HD image size is a Pro feature. Please sign up or upgrade to use it.');
        if (session) {
            setIsMembershipModalOpen(true);
        } else {
            handleGoToPricing();
        }
        return;
    }

    if (!prompt.trim() || !uploadedImage) {
      setError('Please upload a base image and enter a prompt.');
      return;
    }
    
    // Logged-in user: Generate directly
    if (session) {
        const cost = imageSize === '2048' ? getCost('hd_image') : getCost('standard_image');
        const canProceed = await deductCredits(cost);
        if (!canProceed) return;

        setGenerationState(GenerationState.LOADING);
        setError(null);
        setGeneratedImageUrls(null);
        try {
          const baseImagePart = await fileToGenerativePart(uploadedImage);
          const imageUrls = await generateImage(prompt, baseImagePart, imageSize, aspectRatio, generationFidelity, useCannyEdges, useStrictSizing);
          
          setGeneratedImageUrls(imageUrls);
          setGenerationState(GenerationState.SUCCESS);
          setHistoryImageUrls(prev => [...imageUrls, ...prev]);

          if (profile?.plan === 'free' && !sessionStorage.getItem('promoShownThisSession')) {
            setTimeout(() => {
                setIsMembershipPromoOpen(true);
                sessionStorage.setItem('promoShownThisSession', 'true');
            }, 1200);
          }

        } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred during image generation.');
          setGenerationState(GenerationState.ERROR);
          // Refund credits on failure
          updateUserCredits((profile?.credits ?? 0) + cost);
        }
        return;
    }
    
    // Visitor: Join the queue
    if (!session) {
        const cost = getCost('standard_image');
        if ((visitorProfile?.credits ?? 0) < cost) {
            setError("You're out of credits. Sign up for more!");
            handleGoToPricing();
            return;
        }
        if (!queue.includes(visitorId)) {
            setQueue(q => [...q, visitorId]);
            setGenerationState(GenerationState.QUEUED);
        }
    }
  }, [prompt, uploadedImage, session, profile, visitorProfile, queue, visitorId, imageSize, aspectRatio, deductCredits, generationFidelity, useCannyEdges, useStrictSizing, creditCostSettings]);

  const handleGenerateSceneFromStyle = async () => {
    if (!styleReferenceImage) {
        setError("Please upload a style reference image first.");
        return;
    }
    if (!session) {
        setError("This feature is for logged-in users only.");
        handleGoToPricing();
        return;
    }

    const cost = getCost('prompt_from_image');
    const canProceed = await deductCredits(cost);
    if (!canProceed) return;

    setIsGeneratingScene(true);
    setError(null);
    try {
        const imagePart = await fileToGenerativePart(styleReferenceImage);
        const generatedDescription = await generateSceneDescriptionFromImage(imagePart);
        setSceneDescription(generatedDescription);
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during scene generation.');
        updateUserCredits((profile?.credits ?? 0) + cost);
    } finally {
        setIsGeneratingScene(false);
    }
  };

  const handleGenerateMultiPersonImage = useCallback(async () => {
    if (!session) {
        setError("Multi-person generation is available for logged-in users only.");
        handleGoToPricing();
        return;
    }

    if (imageSize === '2048' && profile?.plan !== 'pro') {
        setError('HD image size is a Pro feature. Please upgrade to use it.');
        setIsMembershipModalOpen(true);
        return;
    }

    if (!sceneDescription.trim() || !uploadedImage || !uploadedImageTwo) {
        setError('Please upload two base images and describe the scene.');
        return;
    }

    const cost = imageSize === '2048' ? getCost('hd_image') : getCost('standard_image');
    const canProceed = await deductCredits(cost);
    if (!canProceed) return;

    setGenerationState(GenerationState.LOADING);
    setError(null);
    setGeneratedImageUrls(null);
    try {
        const placementMap: { [key: string]: string } = {
            'side-by-side': 'Place Person 1 and Person 2 side-by-side.',
            'p1-left': 'Place Person 1 (from the first uploaded image) on the left, and Person 2 (from the second image) on the right.',
            'p2-left': 'Place Person 2 (from the second image) on the left, and Person 1 (from the first image) on the right.',
            'one-in-front': 'Place one person slightly in front of the other in a natural pose.'
        };
        const placementText = placementMap[multiPersonPlacement];

        const interactionMap: { [key:string]: string } = {
            'neutral': 'They should have natural, neutral expressions.',
            'smiling': 'They should be smiling happily together.',
            'looking-at-each-other': 'They should be looking at each other.',
            'hugging': 'They should be embracing or hugging.'
        };
        const interactionText = interactionMap[multiPersonInteraction];

        let constructedPrompt = `
**Placement Instructions:** ${placementText}
**Interaction Instructions:** ${interactionText}
**Scene Description:** ${sceneDescription.trim()}
        `;

        if (aspectRatio !== '1:1') {
            constructedPrompt += `\n**Aspect Ratio:** The final image must have a ${aspectRatio} aspect ratio.`;
        }
        if (imageSize === '2048') {
            constructedPrompt += `\n**Quality:** High resolution, 4K, ultra-detailed.`;
        }
        if (useStrictSizing) {
            constructedPrompt += `\n**Sizing:** Strictly adhere to the specified dimensions and aspect ratio. Do not crop the subjects; fit the entire composition within the frame.`;
        }

        const baseImagePart1 = await fileToGenerativePart(uploadedImage);
        const baseImagePart2 = await fileToGenerativePart(uploadedImageTwo);
        const styleReferencePart = styleReferenceImage ? await fileToGenerativePart(styleReferenceImage) : null;
        
        const imageUrls = await generateMultiPersonImage(constructedPrompt, baseImagePart1, baseImagePart2, imageSize, aspectRatio, styleReferencePart, useStrictSizing);
        
        setGeneratedImageUrls(imageUrls);
        setGenerationState(GenerationState.SUCCESS);
        setHistoryImageUrls(prev => [...imageUrls, ...prev]);
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during image generation.');
        setGenerationState(GenerationState.ERROR);
        updateUserCredits((profile?.credits ?? 0) + cost);
    }
  }, [
    uploadedImage, uploadedImageTwo, styleReferenceImage, session, profile, 
    imageSize, aspectRatio, deductCredits, useStrictSizing, creditCostSettings,
    multiPersonPlacement, multiPersonInteraction, sceneDescription
  ]);
  
  const handleGenerateVideo = useCallback(async () => {
    if (profile?.role !== 'admin') {
      setError("Video generation is an admin-only feature.");
      handleModeChange('single');
      return;
    }

    if (!prompt.trim()) {
        setError('Please enter a prompt to describe the video.');
        return;
    }
    if (!session) {
        setError("Video generation is available for logged-in users only.");
        handleGoToPricing();
        return;
    }
    
    const cost = getCost('video_generation');
    const canProceed = await deductCredits(cost);
    if (!canProceed) return;

    setGenerationState(GenerationState.GENERATING_VIDEO);
    setError(null);
    setGeneratedImageUrls(null);
    setGeneratedVideoUrl(null);

    // Revoke old blob URL if it exists to prevent memory leaks
    if (generatedVideoUrl && generatedVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(generatedVideoUrl);
    }

    try {
        const baseImagePart = uploadedImage ? await fileToGenerativePart(uploadedImage) : null;
        
        const downloadLink = await generateVideo(prompt, baseImagePart, videoAspectRatio, videoMotionLevel, videoSeed);
        
        setGeneratedVideoUrl(downloadLink); // Pass the direct URL
        
        setGenerationState(GenerationState.SUCCESS);
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during video generation.');
        setGenerationState(GenerationState.ERROR);
        updateUserCredits((profile?.credits ?? 0) + cost);
    }

  }, [prompt, uploadedImage, session, profile, generatedVideoUrl, handleModeChange, deductCredits, videoAspectRatio, videoMotionLevel, videoSeed, creditCostSettings]);

  const handleRestoreImage = useCallback(async () => {
    if (!uploadedImage) {
        setError('Please upload an image to restore.');
        return;
    }
    if (!Object.values(restoreOptions).some(Boolean)) {
        setError('Please select at least one restoration feature.');
        return;
    }

    const cost = getCost('image_restore');
    // Restore is a premium feature for logged-in users
    if (!session) {
        setError("Image restoration is available for logged-in users only.");
        handleGoToPricing();
        return;
    }

    const canProceed = await deductCredits(cost);
    if (!canProceed) return;

    setGenerationState(GenerationState.LOADING);
    setError(null);
    setGeneratedImageUrls(null);
    try {
        const baseImagePart = await fileToGenerativePart(uploadedImage);
        const imageUrls = await restoreImage(baseImagePart, restoreOptions);
        
        setGeneratedImageUrls(imageUrls);
        setGenerationState(GenerationState.SUCCESS);
        setHistoryImageUrls(prev => [...imageUrls, ...prev]);

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during image restoration.');
        setGenerationState(GenerationState.ERROR);
        updateUserCredits((profile?.credits ?? 0) + cost);
    }
  }, [uploadedImage, restoreOptions, session, profile, deductCredits, creditCostSettings]);

  const handleEditImage = useCallback(async (
    editPrompt: string, 
    baseImagePart: GenerativePart, 
    maskImagePart: GenerativePart | null
) => {
    if (!session) {
        setError("Image editing is available for logged-in users only.");
        handleGoToPricing();
        return;
    }

    const cost = getCost('image_edit');
    const canProceed = await deductCredits(cost);
    if (!canProceed) return;

    setGenerationState(GenerationState.LOADING); // Use main loading state
    setError(null);
    try {
        const imageUrls = await editImage(editPrompt, baseImagePart, maskImagePart);
        
        // Update history in the advanced editor
        setEditorHistory(prev => [...prev, ...imageUrls]);
        setHistoryImageUrls(prev => [...imageUrls, ...prev]); // Also add to main history

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during image editing.');
        // Don't set ERROR state here, let the modal handle its own error display
    } finally {
        setGenerationState(GenerationState.IDLE); // Reset main loading state
    }
  }, [session, profile, deductCredits, creditCostSettings]);

  const generateSingleDecade = async (decade: string, imagePart: GenerativePart) => {
    setDecadeGenerations(prev => ({
        ...prev,
        [decade]: { status: 'loading', url: null }
    }));
    try {
        const prompt = `Reimagine the person in this photo in the style of the ${decade}. The new image should look like a genuine photograph from that era, capturing the characteristic fashion, hairstyles, photo quality (e.g., black and white, faded colors, grain), and overall aesthetic of the ${decade}.`;
        const imageUrls = await generateImage(prompt, imagePart, '1024', '1:1', 'creative');
        
        setDecadeGenerations(prev => ({
            ...prev,
            [decade]: { status: 'success', url: imageUrls[0] }
        }));
    } catch (err) {
        console.error(`Error generating for ${decade}:`, err);
        setDecadeGenerations(prev => ({
            ...prev,
            [decade]: { status: 'error', url: null, error: err instanceof Error ? err.message : 'Generation failed' }
        }));
    }
  };

  const handleGeneratePastForward = async () => {
    if (!uploadedImage || selectedDecades.length === 0) {
        setError("Please upload an image and select at least one decade.");
        return;
    }
    const cost = selectedDecades.length * getCost('standard_image');
    const canProceed = await deductCredits(cost);
    if (!canProceed) return;

    setIsGeneratingDecades(true);
    setError(null);
    const baseImagePart = await fileToGenerativePart(uploadedImage);

    const generationPromises = selectedDecades.map(decade => generateSingleDecade(decade, baseImagePart));
    await Promise.all(generationPromises);

    setIsGeneratingDecades(false);
  };

  const handleRegenerateDecade = async (decade: string) => {
    if (!uploadedImage) return;

    const cost = getCost('standard_image');
    const canProceed = await deductCredits(cost);
    if (!canProceed) return;

    const baseImagePart = await fileToGenerativePart(uploadedImage);
    await generateSingleDecade(decade, baseImagePart);
  };

  const handleGenerateGraphic = async (type: 'illustration' | 'icon' | 'logo_maker' | 'pattern') => {
    if (!graphicPrompt.trim()) {
      setError("Please enter a prompt for your graphic.");
      return;
    }
    const costKey = `graphic_${type}` as keyof Omit<CreditCostSettings, 'id'>;
    const count = type === 'logo_maker' ? 4 : graphicCount;
    const cost = getCost(costKey) * count;

    const canProceed = await deductCredits(cost);
    if (!canProceed) return;

    setGenerationState(GenerationState.LOADING);
    setError(null);
    setGeneratedImageUrls(null);
    setGeneratedSvgs(null);
    try {
      const imageUrls = type === 'logo_maker' 
        ? await generateGraphic(graphicPrompt, logoStyle, 'logo_maker', 4, logoColorPalette, logoNegativePrompt)
        : await generateGraphic(graphicPrompt, graphicStyle, type, graphicCount);
      
      setGeneratedImageUrls(imageUrls);
      setGenerationState(GenerationState.SUCCESS);
      setHistoryImageUrls(prev => [...imageUrls, ...prev]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during graphic generation.');
      setGenerationState(GenerationState.ERROR);
      updateUserCredits((profile?.credits ?? 0) + cost);
    }
  };

  const createGraphicSuiteHandler = (
    costKey: keyof Omit<CreditCostSettings, 'id'>,
    serviceFunc: (imagePart: GenerativePart, ...args: any[]) => Promise<string[]>,
    ...args: any[]
  ) => async () => {
    if (!graphicImage) {
      setError("Please upload an image.");
      return;
    }
    const cost = getCost(costKey);
    const canProceed = await deductCredits(cost);
    if (!canProceed) return;

    setGenerationState(GenerationState.LOADING);
    setError(null);
    setGeneratedImageUrls(null);
    setGeneratedSvgs(null);

    try {
      const imagePart = await fileToGenerativePart(graphicImage);
      const imageUrls = await serviceFunc(imagePart, ...args);
      setGeneratedImageUrls(imageUrls);
      setGenerationState(GenerationState.SUCCESS);
      setHistoryImageUrls(prev => [...imageUrls, ...prev]);
    } catch (err) {
      console.error(`Error in ${costKey}:`, err);
      setError(err instanceof Error ? err.message : `An unknown error occurred during ${costKey}.`);
      setGenerationState(GenerationState.ERROR);
      updateUserCredits((profile?.credits ?? 0) + cost);
    }
  };

  const handleUpscaleGraphic = createGraphicSuiteHandler('graphic_upscale', upscaleImage);
  const handleRemoveBackground = createGraphicSuiteHandler('graphic_remove_background', removeBackground);
  const handleReplaceBackground = createGraphicSuiteHandler('graphic_replace_background', replaceBackground, replaceBackgroundPrompt);
  const handleColorizeGraphic = createGraphicSuiteHandler('graphic_colorize', colorizeGraphic);
  
  const handleGenerateArchitecture = async () => {
    if (!architecturePrompt.trim() || !architectureImage) {
      setError("Please upload a base image and enter a prompt.");
      return;
    }
     if (!session) {
        setError("Architecture suite is for logged-in users only.");
        handleGoToPricing();
        return;
    }

    const costKey = `architecture_${architectureSuiteTool}` as keyof Omit<CreditCostSettings, 'id'>;
    const cost = getCost(costKey);

    const canProceed = await deductCredits(cost);
    if (!canProceed) return;
    
    setGenerationState(GenerationState.LOADING);
    setError(null);
    setGeneratedImageUrls(null);
    setGeneratedSvgs(null);

    try {
      const imagePart = await fileToGenerativePart(architectureImage);
      const imageUrls = await generateArchitectureImage(architecturePrompt, imagePart, architectureSuiteTool);
      setGeneratedImageUrls(imageUrls);
      setGenerationState(GenerationState.SUCCESS);
      setHistoryImageUrls(prev => [...imageUrls, ...prev]);
    } catch (err) {
      console.error(`Error generating architecture image:`, err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during architecture generation.');
      setGenerationState(GenerationState.ERROR);
      updateUserCredits((profile?.credits ?? 0) + cost);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your entire generation history? This action cannot be undone.")) {
        setHistoryImageUrls([]);
    }
  };

  const handleChatSendMessage = async (message: string) => {
    if (!chatSession) {
        const newChat = createChat();
        setChatSession(newChat);
        setChatMessages([{ role: 'user', text: message }]);
        setIsChatLoading(true);
        setChatError(null);
        try {
            const cost = getCost('chat_message');
            const canProceed = await deductCredits(cost);
            if (!canProceed) {
                setIsChatLoading(false);
                setChatMessages([]);
                return;
            }

            const response = await newChat.sendMessage({ message });
            setChatMessages(prev => [...prev, { role: 'model', text: response.text }]);
        } catch (err) {
            setChatError("Sorry, something went wrong. Please try again.");
        } finally {
            setIsChatLoading(false);
        }
    } else {
        setChatMessages(prev => [...prev, { role: 'user', text: message }]);
        setIsChatLoading(true);
        setChatError(null);
         try {
             const cost = getCost('chat_message');
            const canProceed = await deductCredits(cost);
            if (!canProceed) {
                setIsChatLoading(false);
                setChatMessages(prev => prev.slice(0, -1)); // remove user message if no credits
                return;
            }

            const response = await chatSession.sendMessage({ message });
            setChatMessages(prev => [...prev, { role: 'model', text: response.text }]);
        } catch (err) {
            setChatError("Sorry, something went wrong. Please try again.");
             setChatMessages(prev => prev.slice(0, -1)); // remove user message on error
        } finally {
            setIsChatLoading(false);
        }
    }
  };
  
  const handleDownloadAlbum = async (format: 'jpeg' | 'png') => {
    setDownloadingFormat(format);
    try {
        // FIX: Use a type guard with type assertion to correctly infer types after filtering,
        // resolving errors where properties were not found on type `unknown`.
        const successfulGenerations = Object.entries(decadeGenerations)
            .filter(
                (entry): entry is [string, DecadeGeneration & { status: 'success'; url: string }] => {
                    // `entry[1]` is inferred as `unknown`, so we must cast it to check its properties.
                    const gen = entry[1] as DecadeGeneration;
                    return gen.status === 'success' && gen.url !== null;
                },
            )
            .map(([decade, gen]) => ({ decade, url: gen.url }));
        
        const albumDataUrl = await createAlbum(successfulGenerations, `image/${format}`);
        
        const link = document.createElement('a');
        link.href = albumDataUrl;
        link.download = `bestai-past-forward-album.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Failed to create or download album:", e);
        setError("Sorry, there was an error creating the album download.");
    } finally {
        setDownloadingFormat(null);
    }
  };

  const handleContactSubmit = async (formData: ContactFormData) => {
    try {
        await adminService.submitContactForm(formData);
        // The modal itself will show a success message.
    } catch (err) {
        // The modal will handle displaying its own error.
        console.error("Contact form submission failed:", err);
        throw err; // re-throw to be caught by the modal
    }
  };
  
  const handleLaunchApp = () => {
    setAppLaunched(true);
    // Maybe clean up some landing page state if needed
  };

  const handleGoHome = () => setAppLaunched(false);

  // --- Admin Panel Handlers ---

  const handleAdminAddPrompt = async (prompt: { text: string; imageFile: File | null }, categoryTitle: string) => {
    try {
      await adminService.addPrompt(prompt, categoryTitle);
      fetchPrompts(); // Refresh prompts list
    } catch (error) {
      console.error("Error adding prompt:", error);
      setError("Failed to add prompt. See console for details.");
    }
  };

  const handleAdminRemovePrompt = async (promptId: string) => {
    if (window.confirm("Are you sure you want to delete this prompt?")) {
      try {
        await adminService.deletePrompt(promptId);
        fetchPrompts(); // Refresh prompts list
      } catch (error) {
        console.error("Error removing prompt:", error);
        setError("Failed to remove prompt. See console for details.");
      }
    }
  };

  const handleAdminUpdatePrompt = async (promptId: string, updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean }, originalImageUrl: string | null) => {
    try {
      await adminService.updatePrompt(promptId, updates, originalImageUrl);
      fetchPrompts(); // Refresh prompts list
    } catch (error) {
      console.error("Error updating prompt:", error);
      setError("Failed to update prompt. See console for details.");
    }
  };
  
  const handleAdminUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    try {
        await adminService.updateUser(userId, updates);
        setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? {...u, ...updates} : u));
    } catch(error) {
        console.error("Error updating user from admin panel:", error);
        // re-throw to be caught by the component
        throw error;
    }
  };

  const handleAdminDeleteUser = async (userId: string) => {
    try {
        await adminService.deleteUser(userId);
        setAllUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    } catch(error) {
        console.error("Error deleting user from admin panel:", error);
        throw error;
    }
  };

  const handleAdminUpdatePlan = async (planId: number, updates: Partial<Plan>) => {
    try {
        const updatedPlan = await adminService.updatePlan(planId, updates);
        setPlans(prev => prev.map(p => p.id === planId ? updatedPlan : p));
    } catch(e) {
        console.error("Error updating plan from admin panel:", e);
        throw e;
    }
  };
  
  const handleAdminUpdatePaymentSettings = async (updates: Partial<PaymentSettings>) => {
     try {
        const updatedSettings = await adminService.updatePaymentSettings(updates);
        setPaymentSettings(updatedSettings);
    } catch(e) {
        console.error("Error updating payment settings from admin panel:", e);
        throw e;
    }
  };

  const handleAdminAddCountryPrice = async (price: Omit<PlanCountryPrice, 'id'>) => {
    try {
        const newPrice = await adminService.addPlanCountryPrice(price);
        setPlanCountryPrices(prev => [...prev, newPrice]);
    } catch(e) {
        console.error("Error adding country price:", e);
        throw e;
    }
  };
  const handleAdminUpdateCountryPrice = async (priceId: number, updates: Partial<PlanCountryPrice>) => {
    try {
        const updatedPrice = await adminService.updatePlanCountryPrice(priceId, updates);
        setPlanCountryPrices(prev => prev.map(p => p.id === priceId ? updatedPrice : p));
    } catch(e) {
        console.error("Error updating country price:", e);
        throw e;
    }
  };
  const handleAdminDeleteCountryPrice = async (priceId: number) => {
     try {
        await adminService.deletePlanCountryPrice(priceId);
        setPlanCountryPrices(prev => prev.filter(p => p.id !== priceId));
    } catch(e) {
        console.error("Error deleting country price:", e);
        throw e;
    }
  };

  const handleAdminUpdateCreditCostSettings = async (updates: Partial<Omit<CreditCostSettings, 'id'>>) => {
      try {
        const updatedCosts = await adminService.updateCreditCostSettings(updates);
        setCreditCostSettings(updatedCosts);
      } catch (e) {
        console.error("Error updating credit costs:", e);
        throw e;
      }
  };
  
  const handleAdminAddCoupon = async (couponData: Omit<Coupon, 'id' | 'created_at' | 'times_used'>) => {
    try {
        const newCoupon = await adminService.addCoupon(couponData);
        setCoupons(prev => [...prev, newCoupon]);
    } catch (e) {
        console.error("Error adding coupon:", e);
        throw e;
    }
  };
  const handleAdminUpdateCoupon = async (couponId: number, updates: Partial<Coupon>) => {
     try {
        const updatedCoupon = await adminService.updateCoupon(couponId, updates);
        setCoupons(prev => prev.map(c => c.id === couponId ? updatedCoupon : c));
    } catch (e) {
        console.error("Error updating coupon:", e);
        throw e;
    }
  };
  const handleAdminDeleteCoupon = async (couponId: number) => {
     try {
        await adminService.deleteCoupon(couponId);
        setCoupons(prev => prev.filter(c => c.id !== couponId));
    } catch (e) {
        console.error("Error deleting coupon:", e);
        throw e;
    }
  };

  const renderGenerationResult = () => {
    switch (generationState) {
      case GenerationState.QUEUED:
        return (
          <div className="text-center p-4">
            <p className="text-lg font-semibold text-brand">You're in the queue!</p>
            <p className="text-text-secondary">Position: {queue.indexOf(visitorId) + 1} of {queue.length}.</p>
            <p className="text-text-secondary text-sm mt-2">Please wait, your generation will start shortly.</p>
          </div>
        );
      case GenerationState.LOADING:
        return <LoadingIndicator />;
      case GenerationState.GENERATING_VIDEO:
        return <LoadingIndicator messages={VIDEO_LOADING_MESSAGES} IconComponent={VideoCameraIcon} />;
      case GenerationState.SUCCESS:
        if (generatedImageUrls && generatedImageUrls.length > 0) {
          return <ImageDisplay imageUrls={generatedImageUrls} />;
        }
        if (generatedVideoUrl) {
            return <VideoPlayer videoUrl={generatedVideoUrl} />;
        }
        if (generatedSvgs && generatedSvgs.length > 0) {
            // TODO: Display SVGs if needed
            return <ImageDisplay imageUrls={generatedSvgs} />;
        }
        return null;
      case GenerationState.ERROR:
        return error && <div className="text-red-400 text-center p-4 bg-red-900/30 rounded-lg border border-red-500/50">{error}</div>;
      case GenerationState.IDLE:
      default:
        return (
          <div className="flex flex-col items-center justify-center text-center text-text-secondary h-full">
            <div className="p-4 bg-panel-light rounded-full mb-4">
              <SparklesIcon className="w-16 h-16 text-brand" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Your Creation Starts Here</h2>
            <p>Your generated images will appear in this space.</p>
          </div>
        );
    }
  };
  
  const proPlan = plans.find(p => p.name === 'pro');
  const promptFocusLabels: Record<keyof typeof promptFocus, string> = {
    pose: 'Pose & Action',
    style: 'Style & Mood',
    clothing: 'Clothing & Attire',
    dimension: 'Dimension & Composition',
    realism: 'Realism & Detail',
    background: 'Background & Setting',
    lighting: 'Lighting Details',
  };

  return (
    <>
      {!appLaunched ? (
          <LandingPage
            onLaunch={handleLaunchApp}
            onLoginClick={() => setAuthModalView('sign_in')}
            onContactClick={() => setIsContactModalOpen(true)}
            pricingTableRef={pricingTableRef}
            plans={plans}
            session={session}
            profile={profile}
            onSelectPlan={(planName) => {
                if (session) {
                    if (planName === 'pro') {
                        setIsMembershipModalOpen(true);
                    }
                } else {
                    setSelectedPlanForSignup(planName);
                    setAuthModalView('sign_up');
                }
            }}
            country={profile?.country}
            planCountryPrices={planCountryPrices}
            initialScrollTarget={initialScrollTarget}
            onScrollComplete={() => setInitialScrollTarget(null)}
          />
      ) : (
        <div className="min-h-screen bg-background text-text-primary">
          {isMobileSidebarOpen && <div onClick={() => setIsMobileSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden"></div>}
          <div className="flex min-h-screen">
              <Sidebar
                  generationMode={generationMode}
                  graphicSuiteTool={graphicSuiteTool}
                  onModeChange={handleModeChange}
                  onGraphicToolChange={handleGraphicToolChange}
                  architectureSuiteTool={architectureSuiteTool}
                  onArchitectureToolChange={handleArchitectureToolChange}
                  profile={profile}
                  isCollapsed={isSidebarCollapsed}
                  onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  isMobileOpen={isMobileSidebarOpen}
                  onMobileClose={() => setIsMobileSidebarOpen(false)}
                  onGoHome={handleGoHome}
              />

            <div className={`flex-grow transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-64'}`}>
              <main className="p-4 sm:p-6 lg:p-8">
                <Header
                  session={session}
                  profile={profile}
                  visitorProfile={visitorProfile}
                  proPlan={proPlan}
                  onSignUpClick={handleGoToPricing}
                  onLoginClick={() => setAuthModalView('sign_in')}
                  onUpgradeClick={() => setIsMembershipModalOpen(true)}
                  onAdminPanelClick={() => setIsAdminPanelOpen(true)}
                  onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
                  onGoHome={handleGoHome}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  {/* Left Column: Controls */}
                  <div className="bg-panel p-6 rounded-2xl border border-border space-y-6">
                    {/* Generation Mode specific controls */}
                    {generationMode === 'single' && (
                        <div className="space-y-8">
                            {/* Step 1 */}
                            <div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-panel-light text-text-primary font-bold rounded-full border border-border">1</div>
                                    <h3 className="text-lg font-bold text-text-primary">Upload Base Photo</h3>
                                </div>
                                <div className="pl-12 mt-4">
                                    <ImageUploader onImageChange={handleImageChange} imageDataUrl={imageDataUrl} disabled={generationState === GenerationState.LOADING} />
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-panel-light text-text-primary font-bold rounded-full border border-border">2</div>
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary">Get Prompt from Image <span className="text-sm font-normal text-text-secondary">(Optional)</span></h3>
                                        <p className="text-sm text-text-secondary">Let AI describe an image to generate a new prompt.</p>
                                    </div>
                                </div>
                                <div className="pl-12 mt-4 space-y-4">
                                    <ImageUploader onImageChange={handlePromptGenImageChange} imageDataUrl={promptGenImageDataUrl} disabled={isGeneratingPrompt}/>
                                    <div className="p-4 bg-background border border-border rounded-lg space-y-3">
                                        <h4 className="text-sm font-semibold">Describe these elements:</h4>
                                        <div className="flex items-center">
                                            <input id="focus-all" type="checkbox" ref={selectAllPromptFocusRef} onChange={handleSelectAllPromptFocus} className="h-4 w-4 rounded border-border bg-panel-light text-brand focus:ring-brand" />
                                            <label htmlFor="focus-all" className="ml-2 text-sm font-medium">Select All</label>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                            {Object.entries(promptFocusLabels).map(([key, label]) => (
                                                <div key={key} className="flex items-center">
                                                    <input 
                                                        id={`focus-${key}`}
                                                        type="checkbox"
                                                        checked={promptFocus[key as keyof typeof promptFocus]}
                                                        onChange={e => setPromptFocus(p => ({...p, [key]: e.target.checked}))}
                                                        className="h-4 w-4 rounded border-border bg-panel-light text-brand focus:ring-brand"
                                                    />
                                                    <label htmlFor={`focus-${key}`} className="ml-2">{label}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={promptKeywords}
                                        onChange={(e) => setPromptKeywords(e.target.value)}
                                        placeholder="Incorporate Keywords (optional): e.g., cinematic"
                                        className="w-full p-3 bg-background border border-border rounded-lg"
                                        disabled={isGeneratingPrompt}
                                    />
                                    <button onClick={handleGeneratePromptFromImage} disabled={!promptGenImage || isGeneratingPrompt} className="w-full flex items-center justify-center gap-2 p-3 bg-panel-light text-text-primary font-semibold rounded-lg hover:bg-border disabled:opacity-50">
                                        <PaintBrushIcon className="w-5 h-5"/>
                                        {isGeneratingPrompt ? 'Generating...' : `Generate Prompt (${getCost('prompt_from_image')} Credits)`}
                                    </button>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-panel-light text-text-primary font-bold rounded-full border border-border">3</div>
                                    <h3 className="text-lg font-bold text-text-primary">Describe the Transformation</h3>
                                </div>
                                <div className="pl-12 mt-4 space-y-6">
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="e.g., A professional corporate headshot, wearing a dark suit..."
                                        className="w-full h-28 p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand"
                                        disabled={generationState === GenerationState.LOADING}
                                    />
                                     {/* Example Prompts */}
                                    <div className="space-y-4">
                                        <p className="text-sm font-medium text-text-secondary">Or try an example:</p>
                                        {promptsLoading ? (
                                            <p className="text-text-secondary text-sm">Loading prompts...</p>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    placeholder="Search examples..."
                                                    value={promptSearch}
                                                    onChange={e => setPromptSearch(e.target.value)}
                                                    className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                                                />
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                    {examplePrompts.map(category => (
                                                        <button
                                                            key={category.id}
                                                            onClick={() => setSelectedCategory(category.title)}
                                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${selectedCategory === category.title ? 'bg-brand text-white' : 'bg-panel-light hover:bg-border'}`}
                                                        >
                                                            {category.title}
                                                        </button>
                                                    ))}
                                                </div>
                                                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {examplePrompts.find(c => c.title === selectedCategory)?.prompts.filter(p => p.text.toLowerCase().includes(promptSearch.toLowerCase())).slice(0, 3).map(p => (
                                                        <li key={p.id} onClick={() => setPrompt(p.text)} className="relative aspect-[3/4] rounded-lg overflow-hidden group cursor-pointer border border-border">
                                                            {p.imageUrl && <img src={p.imageUrl} alt={p.text} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                                            <p className="absolute bottom-2 left-2 right-2 text-xs text-white font-medium leading-tight line-clamp-2">{p.text}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}
                                    </div>
                                    {/* Generation Settings */}
                                    <div className="p-4 bg-background border border-border rounded-lg space-y-4">
                                        <h4 className="text-sm font-semibold">Generation Settings</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-2">Generation Mode</label>
                                                <div className="grid grid-cols-2 gap-1 bg-panel-light p-1 rounded-lg border border-border">
                                                    <button type="button" onClick={() => setGenerationFidelity('creative')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${generationFidelity === 'creative' ? 'bg-panel text-text-primary shadow' : 'text-text-secondary hover:bg-border'}`}>Creative</button>
                                                    <button type="button" onClick={() => setGenerationFidelity('fidelity')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${generationFidelity === 'fidelity' ? 'bg-panel text-text-primary shadow' : 'text-text-secondary hover:bg-border'}`}>Fidelity</button>
                                                </div>
                                            </div>
                                            {profile?.plan === 'pro' && (
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-2">Image Size</label>
                                                <div className="grid grid-cols-2 gap-1 bg-panel-light p-1 rounded-lg border border-border">
                                                    <button type="button" onClick={() => setImageSize('1024')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${imageSize === '1024' ? 'bg-panel text-text-primary shadow' : 'text-text-secondary hover:bg-border'}`}>Standard <span className="text-xs text-text-tertiary">(1024px)</span></button>
                                                    <button type="button" onClick={() => setImageSize('2048')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${imageSize === '2048' ? 'bg-panel text-text-primary shadow' : 'text-text-secondary hover:bg-border'}`}>HD <span className="text-xs text-text-tertiary">(2048px)</span></button>
                                                </div>
                                            </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="checkbox" checked={useCannyEdges} onChange={e => setUseCannyEdges(e.target.checked)} className="w-4 h-4 rounded text-brand focus:ring-brand bg-panel-light border-border"/>
                                            <span>Use Canny Edges (Strictest Pose)</span>
                                            </label>
                                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="checkbox" checked={useStrictSizing} onChange={e => setUseStrictSizing(e.target.checked)} className="w-4 h-4 rounded text-brand focus:ring-brand bg-panel-light border-border"/>
                                            <span>Strict sizing</span>
                                            </label>
                                        </div>
                                        {profile?.plan === 'pro' && (
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-2">Aspect Ratio</label>
                                                <div className="grid grid-cols-5 gap-1 bg-panel-light p-1 rounded-lg border border-border">
                                                    {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map(ar => (
                                                        <button key={ar} type="button" onClick={() => setAspectRatio(ar)} className={`py-1.5 text-sm font-semibold rounded-md transition-colors ${aspectRatio === ar ? 'bg-panel text-text-primary shadow' : 'text-text-secondary hover:bg-border'}`}>{ar}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                             {/* Final Button */}
                            <div className="pt-4 border-t border-border">
                                 <button onClick={handleGenerateImage} disabled={!prompt.trim() || !uploadedImage || generationState === GenerationState.LOADING || generationState === GenerationState.QUEUED} className="w-full flex items-center justify-center gap-2 p-4 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50 text-lg">
                                    <SparklesIcon className="w-6 h-6"/>
                                    {generationState === GenerationState.QUEUED ? `In Queue (${queue.indexOf(visitorId) + 1}/${queue.length})` : `Generate Image (${getCost(imageSize === '2048' ? 'hd_image' : 'standard_image')} Credits)`}
                                </button>
                            </div>
                        </div>
                    )}

                    {generationMode === 'multi' && (
                        <div className="space-y-8">
                            {/* Step 1: Upload Photos */}
                            <div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-panel-light text-text-primary font-bold rounded-full border border-border">1</div>
                                    <h3 className="text-lg font-bold text-text-primary">Upload Photos</h3>
                                </div>
                                <div className="pl-12 mt-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 text-center text-text-secondary">First Person</h4>
                                            <ImageUploader onImageChange={handleImageChange} imageDataUrl={imageDataUrl} disabled={generationState === GenerationState.LOADING} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 text-center text-text-secondary">Second Person</h4>
                                            <ImageUploader onImageChange={handleImageTwoChange} imageDataUrl={imageDataUrlTwo} disabled={generationState === GenerationState.LOADING} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Upload Style Reference */}
                            <div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-panel-light text-text-primary font-bold rounded-full border border-border">2</div>
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary">Upload Style Reference <span className="text-sm font-normal text-text-secondary">(optional)</span></h3>
                                        <p className="text-sm text-text-secondary">Upload a third image to guide the mood, composition, and background. The people in this image will be ignored.</p>
                                    </div>
                                </div>
                                <div className="pl-12 mt-4 space-y-4">
                                    <ImageUploader onImageChange={handleStyleReferenceImageChange} imageDataUrl={styleReferenceImageDataUrl} disabled={generationState === GenerationState.LOADING || isGeneratingScene} />
                                    <button onClick={handleGenerateSceneFromStyle} disabled={!styleReferenceImage || isGeneratingScene} className="w-full flex items-center justify-center gap-2 p-3 bg-panel-light text-text-primary font-semibold rounded-lg hover:bg-border disabled:opacity-50">
                                        <WandIcon className="w-5 h-5"/>
                                        {isGeneratingScene ? 'Generating...' : `Generate Scene from Style (${getCost('prompt_from_image')} Credits)`}
                                    </button>
                                </div>
                            </div>

                            {/* Step 3: Build Your Scene */}
                            <div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-panel-light text-text-primary font-bold rounded-full border border-border">3</div>
                                    <h3 className="text-lg font-bold text-text-primary">Build Your Scene</h3>
                                </div>
                                <div className="pl-12 mt-4 space-y-6">
                                    {/* Placement */}
                                    <div>
                                        <h4 className="text-sm font-medium text-text-secondary mb-2">Placement</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <SceneBuilderButton label="Side-by-side" value="side-by-side" currentValue={multiPersonPlacement} onClick={setMultiPersonPlacement} />
                                            <SceneBuilderButton label="Person 1 on Left" value="p1-left" currentValue={multiPersonPlacement} onClick={setMultiPersonPlacement} />
                                            <SceneBuilderButton label="Person 2 on Left" value="p2-left" currentValue={multiPersonPlacement} onClick={setMultiPersonPlacement} />
                                            <SceneBuilderButton label="One in Front" value="one-in-front" currentValue={multiPersonPlacement} onClick={setMultiPersonPlacement} />
                                        </div>
                                    </div>
                                    {/* Interaction */}
                                    <div>
                                        <h4 className="text-sm font-medium text-text-secondary mb-2">Interaction</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <SceneBuilderButton label="Neutral Expression" value="neutral" currentValue={multiPersonInteraction} onClick={setMultiPersonInteraction} />
                                            <SceneBuilderButton label="Smiling Together" value="smiling" currentValue={multiPersonInteraction} onClick={setMultiPersonInteraction} />
                                            <SceneBuilderButton label="Looking at Each Other" value="looking-at-each-other" currentValue={multiPersonInteraction} onClick={setMultiPersonInteraction} />
                                            <SceneBuilderButton label="Hugging" value="hugging" currentValue={multiPersonInteraction} onClick={setMultiPersonInteraction} />
                                        </div>
                                    </div>
                                    {/* Scene Description */}
                                    <div>
                                        <h4 className="text-sm font-medium text-text-secondary mb-2">Scene Description</h4>
                                        <textarea
                                            value={sceneDescription}
                                            onChange={(e) => setSceneDescription(e.target.value)}
                                            placeholder="Describe the entire scene: the background, what they are wearing, the lighting, the overall style. e.g., 'At a beach during sunset, wearing casual summer clothes. The lighting is warm and golden. Style should be a candid, happy photograph.'"
                                            className="w-full h-28 p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand"
                                            disabled={generationState === GenerationState.LOADING}
                                        />
                                    </div>
                                    
                                    <div className="p-4 bg-background border border-border rounded-lg space-y-4">
                                        <h4 className="text-sm font-semibold">Generation Settings</h4>
                                        {profile?.plan === 'pro' && (
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-2">Image Size</label>
                                                <div className="grid grid-cols-2 gap-1 bg-panel-light p-1 rounded-lg border border-border">
                                                    <button type="button" onClick={() => setImageSize('1024')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${imageSize === '1024' ? 'bg-panel text-text-primary shadow' : 'text-text-secondary hover:bg-border'}`}>Standard <span className="text-xs text-text-tertiary">(1024px)</span></button>
                                                    <button type="button" onClick={() => setImageSize('2048')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${imageSize === '2048' ? 'bg-panel text-text-primary shadow' : 'text-text-secondary hover:bg-border'}`}>HD <span className="text-xs text-text-tertiary">(2048px)</span></button>
                                                </div>
                                            </div>
                                        )}
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="checkbox" checked={useStrictSizing} onChange={e => setUseStrictSizing(e.target.checked)} className="w-4 h-4 rounded text-brand focus:ring-brand bg-panel-light border-border"/>
                                            <span>Strict sizing</span>
                                        </label>
                                        {profile?.plan === 'pro' && (
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-2">Aspect Ratio</label>
                                                <div className="grid grid-cols-5 gap-1 bg-panel-light p-1 rounded-lg border border-border">
                                                    {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map(ar => (
                                                        <button key={ar} type="button" onClick={() => setAspectRatio(ar)} className={`py-1.5 text-sm font-semibold rounded-md transition-colors ${aspectRatio === ar ? 'bg-panel text-text-primary shadow' : 'text-text-secondary hover:bg-border'}`}>{ar}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Final Button */}
                            <div className="pt-4 border-t border-border">
                                <button onClick={handleGenerateMultiPersonImage} disabled={!sceneDescription.trim() || !uploadedImage || !uploadedImageTwo || generationState === GenerationState.LOADING} className="w-full flex items-center justify-center gap-2 p-4 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50 text-lg">
                                    <SparklesIcon className="w-6 h-6"/>
                                    Generate Image ({getCost(imageSize === '2048' ? 'hd_image' : 'standard_image')} Credits)
                                </button>
                            </div>
                        </div>
                    )}

                    {generationMode === 'video' && (
                         <div className="space-y-4">
                            <ImageUploader onImageChange={handleImageChange} imageDataUrl={imageDataUrl} disabled={generationState === GenerationState.GENERATING_VIDEO} />
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the video you want to create..."
                                className="w-full h-28 p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand"
                                disabled={generationState === GenerationState.GENERATING_VIDEO}
                            />
                             <div className="grid grid-cols-2 gap-4">
                                <select value={videoAspectRatio} onChange={(e) => setVideoAspectRatio(e.target.value as any)} className="w-full p-2 bg-background border border-border rounded-lg text-sm">
                                    <option value="16:9">16:9</option>
                                    <option value="9:16">9:16</option>
                                    <option value="1:1">1:1</option>
                                </select>
                                 <div>
                                    <label className="text-xs text-text-secondary">Motion Level: {videoMotionLevel}</label>
                                    <input type="range" min="1" max="10" value={videoMotionLevel} onChange={e => setVideoMotionLevel(Number(e.target.value))} className="w-full accent-brand" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-text-secondary">Seed (0 for random)</label>
                                <input type="number" value={videoSeed} onChange={e => setVideoSeed(Number(e.target.value))} className="w-full p-2 bg-background border border-border rounded-lg text-sm" />
                            </div>
                           <button onClick={handleGenerateVideo} disabled={!prompt.trim() || generationState === GenerationState.GENERATING_VIDEO} className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                            <VideoCameraIcon className="w-5 h-5"/>
                            Generate Video ({getCost('video_generation')} credits)
                           </button>
                        </div>
                    )}
                    
                    {generationMode === 'restore' && (
                         <div className="space-y-4">
                            <ImageUploader onImageChange={handleImageChange} imageDataUrl={imageDataUrl} disabled={generationState === GenerationState.LOADING} />
                             <div className="space-y-4 p-4 bg-background rounded-lg border border-border">
                                <RestoreOption id="enhanceFaces" label="Enhance Faces" description="Improve clarity and detail in faces." checked={restoreOptions.enhanceFaces} onChange={e => setRestoreOptions(p => ({...p, enhanceFaces: e.target.checked}))} disabled={generationState === GenerationState.LOADING} />
                                <RestoreOption id="removeScratches" label="Remove Scratches" description="Fix dust, scratches, and blemishes." checked={restoreOptions.removeScratches} onChange={e => setRestoreOptions(p => ({...p, removeScratches: e.target.checked}))} disabled={generationState === GenerationState.LOADING} />
                                <RestoreOption id="colorize" label="Colorize" description="Add realistic colors to B&W photos." checked={restoreOptions.colorize} onChange={e => setRestoreOptions(p => ({...p, colorize: e.target.checked}))} disabled={generationState === GenerationState.LOADING} />
                                 <RestoreOption id="upscale" label="Upscale to 4K" description="Increase image resolution and quality." checked={restoreOptions.upscale} onChange={e => setRestoreOptions(p => ({...p, upscale: e.target.checked}))} disabled={generationState === GenerationState.LOADING} isProFeature />
                             </div>
                           <button onClick={handleRestoreImage} disabled={!uploadedImage || generationState === GenerationState.LOADING} className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                            <WandIcon className="w-5 h-5"/>
                            Restore Image ({getCost('image_restore')} credits)
                           </button>
                        </div>
                    )}

                    {generationMode === 'past_forward' && (
                         <div className="space-y-4">
                            <ImageUploader onImageChange={handleImageChange} imageDataUrl={imageDataUrl} disabled={isGeneratingDecades} />
                             <div className="space-y-2">
                                 <label className="text-sm font-semibold text-text-secondary">Select Decades</label>
                                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {DECADES.map(decade => (
                                        <button 
                                            key={decade}
                                            onClick={() => {
                                                setSelectedDecades(prev => 
                                                    prev.includes(decade)
                                                    ? prev.filter(d => d !== decade)
                                                    : [...prev, decade]
                                                )
                                            }}
                                            className={`w-full text-center p-2 rounded-md border text-xs font-medium transition-colors duration-200 ${selectedDecades.includes(decade) ? 'bg-brand/20 border-brand text-brand' : 'bg-panel-light border-border text-text-secondary hover:border-brand/50'}`}
                                        >
                                            {decade}
                                        </button>
                                    ))}
                                 </div>
                                 <div className="flex justify-between text-xs">
                                    <button onClick={() => setSelectedDecades(DECADES)} className="text-brand hover:underline">Select All</button>
                                    <button onClick={() => setSelectedDecades([])} className="text-brand hover:underline">Deselect All</button>
                                 </div>
                             </div>
                           <button onClick={handleGeneratePastForward} disabled={!uploadedImage || selectedDecades.length === 0 || isGeneratingDecades} className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                            <ClockRewindIcon className="w-5 h-5"/>
                            Generate ({selectedDecades.length * getCost('standard_image')} credits)
                           </button>
                        </div>
                    )}
                    
                    {generationMode === 'graphic_suite' && (
                        <div className="space-y-4">
                          {graphicSuiteTool === 'asset_generator' && (
                             <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <AssetTypeButton label="Illustration" value="illustration" currentValue={assetGeneratorTool} onClick={setAssetGeneratorTool} />
                                    <AssetTypeButton label="Icon" value="icon" currentValue={assetGeneratorTool} onClick={setAssetGeneratorTool} />
                                    <AssetTypeButton label="Pattern" value="pattern" currentValue={assetGeneratorTool} onClick={setAssetGeneratorTool} />
                                </div>
                                <textarea
                                    value={graphicPrompt}
                                    onChange={(e) => setGraphicPrompt(e.target.value)}
                                    placeholder={`Describe the ${assetGeneratorTool} you want...`}
                                    className="w-full h-24 p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand"
                                    disabled={generationState === GenerationState.LOADING}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-text-secondary">Style</label>
                                        <select value={graphicStyle} onChange={e => setGraphicStyle(e.target.value)} className="w-full p-2 bg-background border border-border rounded-lg text-sm">
                                            <option>Flat</option>
                                            <option>3D</option>
                                            <option>Minimalist</option>
                                            <option>Watercolor</option>
                                            <option>Low Poly</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-secondary">Count: {graphicCount}</label>
                                         <input type="range" min="1" max="4" value={graphicCount} onChange={e => setGraphicCount(Number(e.target.value))} className="w-full accent-brand" />
                                    </div>
                                </div>
                                 <button onClick={() => handleGenerateGraphic(assetGeneratorTool)} disabled={!graphicPrompt.trim() || generationState === GenerationState.LOADING} className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                                    <SparklesIcon className="w-5 h-5"/>
                                    Generate ({getCost(`graphic_${assetGeneratorTool}` as any) * graphicCount} credits)
                                 </button>
                             </div>
                          )}
                          {graphicSuiteTool === 'logo_maker' && (
                            <div className="space-y-4">
                                <textarea
                                    value={graphicPrompt}
                                    onChange={(e) => setGraphicPrompt(e.target.value)}
                                    placeholder="Describe your brand, e.g., 'A majestic eagle for a tech company'"
                                    className="w-full h-24 p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand"
                                    disabled={generationState === GenerationState.LOADING}
                                />
                                <div className="p-4 bg-background border border-border rounded-lg space-y-4">
                                    <h4 className="text-sm font-semibold">Advanced Options</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Logo Style</label>
                                            <select value={logoStyle} onChange={e => setLogoStyle(e.target.value)} className="w-full p-2 bg-panel-light border border-border rounded-lg text-sm">
                                                <option>Minimalist</option>
                                                <option>Geometric</option>
                                                <option>Abstract</option>
                                                <option>3D</option>
                                                <option>Vintage</option>
                                                <option>Hand-drawn</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Color Palette (optional)</label>
                                            <input
                                                type="text"
                                                value={logoColorPalette}
                                                onChange={(e) => setLogoColorPalette(e.target.value)}
                                                placeholder="e.g., Blue, white, silver"
                                                className="w-full p-2 bg-panel-light border border-border rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Negative Prompt (optional)</label>
                                        <input
                                            type="text"
                                            value={logoNegativePrompt}
                                            onChange={(e) => setLogoNegativePrompt(e.target.value)}
                                            placeholder="Things to avoid, e.g., text, complex shapes"
                                            className="w-full p-2 bg-panel-light border border-border rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                                <button onClick={() => handleGenerateGraphic('logo_maker')} disabled={!graphicPrompt.trim() || generationState === GenerationState.LOADING} className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                                    <SparklesIcon className="w-5 h-5"/>
                                    Generate Logos ({getCost('graphic_logo_maker') * 4} credits)
                                </button>
                            </div>
                          )}
                           {graphicSuiteTool === 'photo_editor' && (
                               <div className="space-y-4 text-center">
                                   <ImageUploader onImageChange={handleGraphicImageChange} imageDataUrl={graphicImageDataUrl} disabled={generationState === GenerationState.LOADING} />
                                   <p className="text-text-secondary text-sm">Upload an image to open it in the Advanced Editor.</p>
                               </div>
                           )}
                           {graphicSuiteTool === 'upscale' && (
                                <div className="space-y-4">
                                    <ImageUploader onImageChange={handleGraphicImageChange} imageDataUrl={graphicImageDataUrl} disabled={generationState === GenerationState.LOADING} />
                                    <button onClick={handleUpscaleGraphic} disabled={!graphicImage || generationState === GenerationState.LOADING} className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                                        <ArrowsPointingOutIcon className="w-5 h-5"/>
                                        Upscale Image ({getCost('graphic_upscale')} credits)
                                    </button>
                                </div>
                           )}
                            {graphicSuiteTool === 'remove_background' && (
                                <div className="space-y-4">
                                    <ImageUploader onImageChange={handleGraphicImageChange} imageDataUrl={graphicImageDataUrl} disabled={generationState === GenerationState.LOADING} />
                                    <button onClick={handleRemoveBackground} disabled={!graphicImage || generationState === GenerationState.LOADING} className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                                        <ScissorsIcon className="w-5 h-5"/>
                                        Remove Background ({getCost('graphic_remove_background')} credits)
                                    </button>
                                </div>
                           )}
                           {graphicSuiteTool === 'replace_background' && (
                                <div className="space-y-4">
                                    <ImageUploader onImageChange={handleGraphicImageChange} imageDataUrl={graphicImageDataUrl} disabled={generationState === GenerationState.LOADING} />
                                     <textarea
                                        value={replaceBackgroundPrompt}
                                        onChange={(e) => setReplaceBackgroundPrompt(e.target.value)}
                                        placeholder="Describe the new background..."
                                        className="w-full h-24 p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand"
                                        disabled={generationState === GenerationState.LOADING}
                                    />
                                    <button onClick={handleReplaceBackground} disabled={!graphicImage || !replaceBackgroundPrompt.trim() || generationState === GenerationState.LOADING} className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                                        <GlobeAltIcon className="w-5 h-5"/>
                                        Replace Background ({getCost('graphic_replace_background')} credits)
                                    </button>
                                </div>
                           )}
                           {graphicSuiteTool === 'colorize' && (
                                <div className="space-y-4">
                                    <ImageUploader onImageChange={handleGraphicImageChange} imageDataUrl={graphicImageDataUrl} disabled={generationState === GenerationState.LOADING} />
                                    <button onClick={handleColorizeGraphic} disabled={!graphicImage || generationState === GenerationState.LOADING} className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                                        <SwatchIcon className="w-5 h-5"/>
                                        Colorize Image ({getCost('graphic_colorize')} credits)
                                    </button>
                                </div>
                           )}

                        </div>
                    )}

                    {generationMode === 'architecture_suite' && (
                        <div className="space-y-4">
                             <ImageUploader onImageChange={handleArchitectureImageChange} imageDataUrl={architectureImageDataUrl} disabled={generationState === GenerationState.LOADING} />
                            <textarea
                                value={architecturePrompt}
                                onChange={(e) => setArchitecturePrompt(e.target.value)}
                                placeholder="e.g., 'A modern style with large windows and a wooden facade'"
                                className="w-full h-28 p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand"
                                disabled={generationState === GenerationState.LOADING}
                            />
                            <button onClick={handleGenerateArchitecture} disabled={!architectureImage || !architecturePrompt.trim() || generationState === GenerationState.LOADING} className="w-full flex items-center justify-center gap-2 p-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                                <SparklesIcon className="w-5 h-5"/>
                                Generate {architectureSuiteTool.charAt(0).toUpperCase() + architectureSuiteTool.slice(1)} ({getCost(`architecture_${architectureSuiteTool}` as keyof Omit<CreditCostSettings, 'id'>)} credits)
                            </button>
                        </div>
                    )}
                  </div>

                  {/* Right Column: Display */}
                  <div className="bg-panel p-6 rounded-2xl border border-border flex items-center justify-center sticky top-8" style={{minHeight: '400px'}}>
                      {generationMode === 'past_forward' ? (
                          <PastForwardGrid
                            generations={decadeGenerations}
                            onRegenerate={handleRegenerateDecade}
                            isGenerating={isGeneratingDecades}
                            uploadedImage={!!uploadedImage}
                            onDownloadAlbum={handleDownloadAlbum}
                            downloadingFormat={downloadingFormat}
                          />
                      ) : renderGenerationResult() }
                  </div>
                </div>
                
                {session && historyImageUrls.length > 0 && (
                    <HistoryDisplay imageUrls={historyImageUrls} onClear={handleClearHistory} />
                )}

                <Footer onContactClick={() => setIsContactModalOpen(true)} />
              </main>
            </div>
          </div>
        </div>
      )}

      {/* Global Modals */}
      {authModalView && <Auth initialView={authModalView} onClose={() => setAuthModalView(null)} selectedPlan={selectedPlanForSignup} />}
      
      {(isMembershipModalOpen || isMembershipPromoOpen) && proPlan && profile && (
        <MembershipModal
          plan={proPlan}
          profile={profile}
          onClose={() => {
              setIsMembershipModalOpen(false);
              setIsMembershipPromoOpen(false);
          }}
          onUpgrade={handleUpgradeToPro}
          country={profile?.country}
          paymentSettings={paymentSettings}
          planCountryPrices={planCountryPrices}
          isPromo={isMembershipPromoOpen}
        />
      )}

      {isAdminPanelOpen && (
        <AdminPanel
            allUsers={allUsers}
            plans={plans}
            prompts={examplePrompts}
            paymentSettings={paymentSettings}
            planCountryPrices={planCountryPrices}
            coupons={coupons}
            creditCostSettings={creditCostSettings}
            onAddPrompt={handleAdminAddPrompt}
            onRemovePrompt={handleAdminRemovePrompt}
            onUpdatePrompt={handleAdminUpdatePrompt}
            onUpdateUser={handleAdminUpdateUser}
            onDeleteUser={handleAdminDeleteUser}
            onUpdatePlan={handleAdminUpdatePlan}
            onUpdatePaymentSettings={handleAdminUpdatePaymentSettings}
            onAddPlanCountryPrice={handleAdminAddCountryPrice}
            onUpdatePlanCountryPrice={handleAdminUpdateCountryPrice}
            onDeletePlanCountryPrice={handleAdminDeleteCountryPrice}
            onUpdateCreditCostSettings={handleAdminUpdateCreditCostSettings}
            onAddCoupon={handleAdminAddCoupon}
            onUpdateCoupon={handleAdminUpdateCoupon}
            onDeleteCoupon={handleAdminDeleteCoupon}
            onClose={() => setIsAdminPanelOpen(false)}
        />
      )}

      {isContactModalOpen && (
        <ContactModal
            onClose={() => setIsContactModalOpen(false)}
            session={session}
            profile={profile}
        />
      )}
      
      {session && isChatOpen && profile && (
        <ChatBox
            messages={chatMessages}
            isLoading={isChatLoading}
            error={chatError}
            profile={profile}
            onClose={() => setIsChatOpen(false)}
            onSendMessage={handleChatSendMessage}
            chatCreditCost={getCost('chat_message')}
        />
      )}

      {session && isEditorOpen && (
        <AdvancedEditor 
            originalImage={graphicImage}
            history={editorHistory}
            isLoading={generationState === GenerationState.LOADING}
            onClose={() => setIsEditorOpen(false)}
            onGenerate={handleEditImage}
            onHistoryChange={setEditorHistory}
        />
      )}
      
      {/* Chat toggle button */}
      {appLaunched && session && profile && (
        <button
          onClick={() => setIsChatOpen(prev => !prev)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-brand text-white rounded-full shadow-lg flex items-center justify-center transform hover:-translate-y-1 transition-transform z-50"
          aria-label="Toggle AI Assistant"
        >
          {isChatOpen ? <XMarkIcon className="w-8 h-8"/> : <ChatBubbleLeftRightIcon className="w-8 h-8"/>}
        </button>
      )}
    </>
  );
};

export default App;