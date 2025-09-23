import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GenerationState, GenerativePart, PromptCategory, Prompt, Session, UserProfile, VisitorProfile, Plan, PaymentSettings, PlanCountryPrice, ContactFormData, ChatMessage, AppSettings, Coupon } from './types';
import { generateImage, generateMultiPersonImage, generatePromptFromImage, createChat, generateVideo } from './services/geminiService';
import * as adminService from './services/adminService';
import { supabase } from './services/supabaseClient';
import { DEFAULT_PLANS, VIDEO_LOADING_MESSAGES } from './constants';
import { SparklesIcon, PhotoIcon, UsersIcon, StarIcon, MailIcon, XMarkIcon, ChatBubbleLeftRightIcon, VideoCameraIcon } from './components/Icons';
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
import { Chat } from '@google/genai';
import { fileToGenerativePart } from './utils/fileHelpers';
import ContactModal from './components/ContactModal';


const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
};

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [generationState, setGenerationState] = useState<GenerationState>(GenerationState.IDLE);
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[] | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Auth & Profile state
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [visitorProfile, setVisitorProfile] = useState<VisitorProfile | null>(null);
  const [authModalView, setAuthModalView] = useState<'sign_in' | 'sign_up' | null>(null);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planCountryPrices, setPlanCountryPrices] = useState<PlanCountryPrice[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Generation Mode
  const [generationMode, setGenerationMode] = useState<'single' | 'multi' | 'video'>('single');
  
  // Image states
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [uploadedImageTwo, setUploadedImageTwo] = useState<File | null>(null);
  const [imageDataUrlTwo, setImageDataUrlTwo] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<'1024' | '2048'>('1024');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  
  // "Photo to Prompt" feature states
  const [promptGenImage, setPromptGenImage] = useState<File | null>(null);
  const [promptGenImageDataUrl, setPromptGenImageDataUrl] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptFocus, setPromptFocus] = useState({
    realism: true,
    style: true,
    background: true,
    clothing: false,
    lighting: false,
  });
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

  const IMAGE_CREDIT_COST = appSettings?.image_credit_cost ?? 3;
  const VIDEO_CREDIT_COST = appSettings?.video_credit_cost ?? 50;
  const PROMPT_CREDIT_COST = appSettings?.prompt_credit_cost ?? 1;
  const CHAT_CREDIT_COST = appSettings?.chat_credit_cost ?? 1;

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
        let currentVisitor: VisitorProfile;

        if (storedVisitor) {
            currentVisitor = JSON.parse(storedVisitor);
        } else {
            // First time visitor, give one-time credits
            currentVisitor = { credits: 15 };
        }
        setVisitorProfile(currentVisitor);
        localStorage.setItem('visitorProfile', JSON.stringify(currentVisitor));
    } catch (e) {
        console.error("Failed to manage visitor profile:", e);
        setVisitorProfile({ credits: 15 });
    }
  }, [session]);

  // Queue Processing Effect for Visitors
  useEffect(() => {
    if (isSystemBusy || queue.length === 0 || !visitorId) {
        return;
    }

    const processQueue = async () => {
        setIsSystemBusy(true);
        const nextInQueueId = queue[0];

        if (nextInQueueId === visitorId && uploadedImage && prompt) {
            // It's this user's turn
            setGenerationState(GenerationState.LOADING);
            setError(null);
            setGeneratedImageUrls(null);
            
            try {
                const baseImagePart = await fileToGenerativePart(uploadedImage);
                const imageUrls = await generateImage(prompt, baseImagePart, imageSize, aspectRatio);
                setGeneratedImageUrls(imageUrls);
                setGenerationState(GenerationState.SUCCESS);
                setHistoryImageUrls(prev => [...imageUrls, ...prev]);

                const newCredits = (visitorProfile?.credits ?? 1) - IMAGE_CREDIT_COST;
                updateUserCredits(newCredits);
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred during image generation.');
                setGenerationState(GenerationState.ERROR);
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
  }, [queue, isSystemBusy, visitorId, uploadedImage, prompt, visitorProfile, imageSize, aspectRatio, IMAGE_CREDIT_COST]);

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

  // Fetch Plans & Settings Effect
  useEffect(() => {
    const fetchSharedData = async () => {
        try {
            const [fetchedPlans, settings, countryPrices, fetchedAppSettings] = await Promise.all([
                adminService.getPlans(),
                adminService.getPaymentSettings(),
                adminService.getPlanCountryPrices(),
                adminService.getAppSettings()
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
            setAppSettings(fetchedAppSettings);
        } catch (error) {
            console.error("Error fetching shared data (plans, settings):", error);
            // On failure, use default plans to ensure the UI is still functional
            setPlans(DEFAULT_PLANS);
        }
    };
    fetchSharedData();
  }, []);

  // Profile & Credits Effect
  useEffect(() => {
    const getProfile = async () => {
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, credits, plan, role, credits_reset_at, phone, country')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfile(null);
          return;
        }

        if (data) {
          // Check for credit renewal
          const lastReset = new Date(data.credits_reset_at);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          if (lastReset < thirtyDaysAgo) {
            const planDetails = plans.find(p => p.name === data.plan);
            const creditsToSet = planDetails ? planDetails.credits_per_month : (data.plan === 'pro' ? 1300 : 80);
            
            const { data: updatedProfile, error: updateError } = await supabase
              .from('profiles')
              .update({ credits: creditsToSet, credits_reset_at: new Date().toISOString() })
              .eq('id', session.user.id)
              .select('id, email, credits, plan, role, credits_reset_at, phone, country')
              .single();
            
            if (updateError) {
              console.error("Error renewing credits:", updateError);
              setProfile(data); // Set old data on error
            } else {
              setProfile(updatedProfile); // Set renewed data
            }
          } else {
            setProfile(data); // Set current data
          }
        }
      } else {
        setProfile(null);
      }
    };
    if (plans.length > 0) { // Only fetch profile once plans are loaded
        getProfile();
    }
  }, [session, plans]);
  
  const handleModeChange = useCallback((mode: 'single' | 'multi' | 'video') => {
    setGenerationMode(mode);
    setGeneratedImageUrls(null);
    setGeneratedVideoUrl(null);
    setGenerationState(GenerationState.IDLE);
    setError(null);
  }, []);
  
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

  const handleUpgradeToPro = async () => {
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
                credits: proPlan.credits_per_month, 
                credits_reset_at: new Date().toISOString() 
            })
            .eq('id', session.user.id)
            .select('id, email, credits, plan, role, credits_reset_at, phone, country')
            .single();

        if (error) throw error;
        if (data) {
            setProfile(data);
            setIsMembershipModalOpen(false);
        }
    } catch (err) {
        console.error("Error upgrading to pro:", err);
        setError("Could not complete upgrade. Please try again.");
    }
  };

  useEffect(() => {
    const fetchPrompts = async () => {
      setPromptsLoading(true);
      try {
        const promptsFromDb = await adminService.getPrompts();
        setExamplePrompts(promptsFromDb);
        if (promptsFromDb && promptsFromDb.length > 0) {
          setSelectedCategory(promptsFromDb[0].title);
        } else {
          setSelectedCategory('');
        }
      } catch (error) {
        console.error("Failed to fetch example prompts from Supabase:", error);
        setError("Could not load example prompts. Please check your connection and try again.");
      } finally {
        setPromptsLoading(false);
      }
    };
    fetchPrompts();
  }, []);
  
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
        if (authModalView) setAuthModalView(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile, isChatOpen, isAdminPanelOpen, isContactModalOpen, isMembershipModalOpen, authModalView]);
  
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
            } catch (error) {
                console.error("Error fetching admin data:", error);
                setError("Could not load administrator data.");
            }
        }
    };
    fetchAdminData();
  }, [isAdminPanelOpen, profile?.role]);


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

  const currentCredits = session ? profile?.credits : visitorProfile?.credits;
  
  const handleGeneratePromptFromImage = async () => {
    if ((currentCredits ?? 0) < PROMPT_CREDIT_COST) {
        setError("You don't have enough credits.");
        if (!session) setAuthModalView('sign_up');
        return;
    }
    if (!promptGenImage) {
        setError("Please upload an image to generate a prompt from.");
        return;
    }
    setIsGeneratingPrompt(true);
    setError(null);
    try {
        const imagePart = await fileToGenerativePart(promptGenImage);
        const generatedPrompt = await generatePromptFromImage(imagePart, promptFocus, promptKeywords);
        setPrompt(generatedPrompt);
        
        const newCredits = (currentCredits ?? 0) - PROMPT_CREDIT_COST;
        if (session) {
            const { data } = await supabase.from('profiles').update({ credits: newCredits }).eq('id', session.user.id).select().single();
            if(data) setProfile(p => p ? {...p, credits: data.credits} : null);
        } else {
            updateUserCredits(newCredits);
        }

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during prompt generation.');
    } finally {
        setIsGeneratingPrompt(false);
    }
  };

  const handleGenerateImage = useCallback(async () => {
    if ((currentCredits ?? 0) < IMAGE_CREDIT_COST) {
      setError("You're out of credits. Sign up for 80 more!");
      if (!session) setAuthModalView('sign_up');
      return;
    }

    if (imageSize === '2048' && (!session || profile?.plan !== 'pro')) {
        setError('HD image size is a Pro feature. Please sign up or upgrade to use it.');
        if (session) {
            setIsMembershipModalOpen(true);
        } else {
            setAuthModalView('sign_up');
        }
        return;
    }

    if (!prompt.trim() || !uploadedImage) {
      setError('Please upload a base image and enter a prompt.');
      return;
    }
    
    // Logged-in user: Generate directly
    if (session) {
        setGenerationState(GenerationState.LOADING);
        setError(null);
        setGeneratedImageUrls(null);
        try {
          const baseImagePart = await fileToGenerativePart(uploadedImage);
          const imageUrls = await generateImage(prompt, baseImagePart, imageSize, aspectRatio);
          
          setGeneratedImageUrls(imageUrls);
          setGenerationState(GenerationState.SUCCESS);
          setHistoryImageUrls(prev => [...imageUrls, ...prev]);

          const newCredits = (currentCredits ?? 0) - IMAGE_CREDIT_COST;
          const { data } = await supabase.from('profiles').update({ credits: newCredits }).eq('id', session.user.id).select().single();
          if (data) setProfile(p => p ? {...p, credits: data.credits} : null);

        } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred during image generation.');
          setGenerationState(GenerationState.ERROR);
        }
        return;
    }
    
    // Visitor: Join the queue
    if (!session) {
        if (!queue.includes(visitorId)) {
            setQueue(q => [...q, visitorId]);
            setGenerationState(GenerationState.QUEUED);
        }
    }
  }, [prompt, uploadedImage, session, profile, visitorProfile, currentCredits, queue, visitorId, imageSize, aspectRatio, IMAGE_CREDIT_COST]);

  const handleGenerateMultiPersonImage = useCallback(async () => {
    if ((currentCredits ?? 0) < IMAGE_CREDIT_COST) {
        setError("You're out of credits.");
        if (!session) setAuthModalView('sign_up');
        return;
    }

    if (!session) {
        setError("Multi-person generation is available for logged-in users only.");
        setAuthModalView('sign_up');
        return;
    }

    if (imageSize === '2048' && profile?.plan !== 'pro') {
        setError('HD image size is a Pro feature. Please upgrade to use it.');
        setIsMembershipModalOpen(true);
        return;
    }

    if (!prompt.trim() || !uploadedImage || !uploadedImageTwo) {
        setError('Please upload two base images and enter a prompt.');
        return;
    }

    setGenerationState(GenerationState.LOADING);
    setError(null);
    setGeneratedImageUrls(null);
    try {
        const baseImagePart1 = await fileToGenerativePart(uploadedImage);
        const baseImagePart2 = await fileToGenerativePart(uploadedImageTwo);
        const imageUrls = await generateMultiPersonImage(prompt, baseImagePart1, baseImagePart2, imageSize, aspectRatio);
        
        setGeneratedImageUrls(imageUrls);
        setGenerationState(GenerationState.SUCCESS);
        setHistoryImageUrls(prev => [...imageUrls, ...prev]);

        const newCredits = (currentCredits ?? 0) - IMAGE_CREDIT_COST;
        const { data } = await supabase.from('profiles').update({ credits: newCredits }).eq('id', session.user.id).select().single();
        if (data) setProfile(p => p ? {...p, credits: data.credits} : null);

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during image generation.');
        setGenerationState(GenerationState.ERROR);
    }
  }, [prompt, uploadedImage, uploadedImageTwo, session, profile, currentCredits, imageSize, aspectRatio, IMAGE_CREDIT_COST]);
  
  const handleGenerateVideo = useCallback(async () => {
    if (profile?.role !== 'admin') {
      setError("Video generation is an admin-only feature.");
      handleModeChange('single');
      return;
    }

    if ((currentCredits ?? 0) < VIDEO_CREDIT_COST) {
        setError(`You need at least ${VIDEO_CREDIT_COST} credits to generate a video.`);
        if (!session) setAuthModalView('sign_up');
        return;
    }
    if (!prompt.trim()) {
        setError('Please enter a prompt to describe the video.');
        return;
    }
    if (!session) {
        setError("Video generation is available for logged-in users only.");
        setAuthModalView('sign_up');
        return;
    }


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
        
        const downloadLink = await generateVideo(prompt, baseImagePart);
        
        setGeneratedVideoUrl(downloadLink); // Pass the direct URL
        
        setGenerationState(GenerationState.SUCCESS);

        const newCredits = (currentCredits ?? 0) - VIDEO_CREDIT_COST;
        const { data } = await supabase.from('profiles').update({ credits: newCredits }).eq('id', session.user.id).select().single();
        if (data) setProfile(p => p ? {...p, credits: data.credits} : null);

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during video generation.');
        setGenerationState(GenerationState.ERROR);
    }

  }, [prompt, uploadedImage, session, profile, currentCredits, generatedVideoUrl, handleModeChange, VIDEO_CREDIT_COST]);
  
  const handleLeaveQueue = () => {
    setQueue(q => q.filter(id => id !== visitorId));
    setGenerationState(GenerationState.IDLE);
  };

  const handleCategoryClick = (title: string) => {
    setSelectedCategory(title);
    setShowAllPrompts(false); 
    setPromptSearch('');
  };
  
  const handleExampleClick = async (p: Prompt) => {
    setPrompt(p.text);
    // If the example prompt has an associated image, load it,
    // replacing any image the user has already uploaded.
    if (p.imageUrl) {
      try {
        setError(null); // Clear previous errors
        const file = await dataUrlToFile(p.imageUrl, 'example-image.png');
        handleImageChange(file);
      } catch (e) {
        console.error("Failed to load example image", e);
        setError("Could not load the example image.");
      }
    }
  };

  const handleToggleChat = () => {
    if (!session) {
        setAuthModalView('sign_up');
        return;
    }
    
    setIsChatOpen(prev => !prev);
    
    if (!chatSession) {
        setChatSession(createChat());
        if (chatMessages.length === 0) {
            setChatMessages([{ role: 'model', text: "Hello! I'm your AI assistant. Ask me anything about the app or for prompt ideas!" }]);
        }
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!chatSession || !profile) return;
    
    if ((currentCredits ?? 0) < CHAT_CREDIT_COST) {
        setChatError("You don't have enough credits to chat.");
        return;
    }

    setIsChatLoading(true);
    setChatError(null);
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    
    try {
        const response = await chatSession.sendMessage({ message });
        setChatMessages(prev => [...prev, { role: 'model', text: response.text }]);
        
        const newCredits = profile.credits - CHAT_CREDIT_COST;
        const { data } = await supabase.from('profiles').update({ credits: newCredits }).eq('id', profile.id).select().single();
        if (data) setProfile(p => p ? {...p, credits: data.credits} : null);
        
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setChatError(`Sorry, something went wrong: ${errorMessage}`);
        setChatMessages(prev => [...prev, { role: 'model', text: `Sorry, I couldn't process that. Please try again.` }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleAddPrompt = async (prompt: { text: string; imageFile: File | null }, categoryTitle: string) => {
    try {
        const updatedPrompts = await adminService.addPrompt(prompt, categoryTitle);
        setExamplePrompts(updatedPrompts);
    } catch (error) {
        console.error("Failed to add prompt:", error);
        setError("Could not save the new prompt.");
    }
  };

  const handleUpdatePrompt = async (
    promptId: string, 
    updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean },
    originalImageUrl: string | null
  ) => {
    try {
        const updatedPrompts = await adminService.updatePrompt(promptId, updates, originalImageUrl);
        setExamplePrompts(updatedPrompts);
    } catch (error) {
        console.error("Failed to update prompt:", error);
        setError("Could not update the prompt.");
    }
  };

  const handleRemovePrompt = async (promptId: string) => {
    try {
        const updatedPrompts = await adminService.deletePrompt(promptId);
        setExamplePrompts(updatedPrompts);
    } catch (error) {
        console.error("Failed to remove prompt:", error);
        setError("Could not remove the prompt.");
    }
  };
  
  const handleAdminUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    const updatedUser = await adminService.updateUser(userId, updates);
    setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? updatedUser : u));
    if (profile?.id === userId) {
        setProfile(p => p ? { ...p, ...updatedUser } : null);
    }
  };

  const handleAdminDeleteUser = async (userId: string) => {
    await adminService.deleteUser(userId);
    setAllUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
  };
  
  const handleAdminUpdatePlan = async (planId: number, updates: Partial<Plan>) => {
    const updatedPlan = await adminService.updatePlan(planId, updates);
    setPlans(prevPlans => prevPlans.map(p => p.id === planId ? updatedPlan : p));
  }

  const handleAdminUpdatePaymentSettings = async (updates: Partial<PaymentSettings>) => {
    const updatedSettings = await adminService.updatePaymentSettings(updates);
    setPaymentSettings(updatedSettings);
  };
  
  const handleAdminAddPlanCountryPrice = async (price: Omit<PlanCountryPrice, 'id'>) => {
    const newPrice = await adminService.addPlanCountryPrice(price);
    setPlanCountryPrices(prev => [...prev, newPrice]);
  };
    
  const handleAdminUpdatePlanCountryPrice = async (priceId: number, updates: Partial<PlanCountryPrice>) => {
    const updatedPrice = await adminService.updatePlanCountryPrice(priceId, updates);
    setPlanCountryPrices(prev => prev.map(p => p.id === priceId ? updatedPrice : p));
  };

  const handleAdminDeletePlanCountryPrice = async (priceId: number) => {
    await adminService.deletePlanCountryPrice(priceId);
    setPlanCountryPrices(prev => prev.filter(p => p.id !== priceId));
  };

  const handleAdminUpdateAppSettings = async (updates: Partial<Omit<AppSettings, 'id'>>) => {
      const updatedSettings = await adminService.updateAppSettings(updates);
      setAppSettings(updatedSettings);
  };

  const handleAdminAddCoupon = async (couponData: Omit<Coupon, 'id' | 'times_used' | 'created_at'>) => {
      const newCoupon = await adminService.addCoupon(couponData);
      setCoupons(prev => [newCoupon, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  const handleAdminUpdateCoupon = async (couponId: number, updates: Partial<Coupon>) => {
      const updatedCoupon = await adminService.updateCoupon(couponId, updates);
      setCoupons(prev => prev.map(c => c.id === couponId ? updatedCoupon : c));
  };

  const handleAdminDeleteCoupon = async (couponId: number) => {
      await adminService.deleteCoupon(couponId);
      setCoupons(prev => prev.filter(c => c.id !== couponId));
  };

  const handlePlanSelection = (planName: string) => {
    if (planName === 'pro') {
      if (session) {
        setIsMembershipModalOpen(true); // User is logged in, wants to upgrade
      } else {
        setAuthModalView('sign_up'); // Visitor wants pro, needs to sign up first
      }
    } else if (planName === 'free') {
      if (!session) {
        setAuthModalView('sign_up'); // Visitor wants free, needs to sign up
      }
    }
  };

  const handleSignUpClick = () => {
    pricingTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleClearHistory = () => {
    setHistoryImageUrls([]);
  };

  const isGenerating = generationState === GenerationState.LOADING || generationState === GenerationState.GENERATING_VIDEO;
  const isQueued = generationState === GenerationState.QUEUED;
  
  const activeCategory = examplePrompts.find(cat => cat.title === selectedCategory) || examplePrompts[0];
  const filteredPrompts = activeCategory?.prompts.filter(p => {
    const text = p.text;
    return text.toLowerCase().includes(promptSearch.toLowerCase())
  }) || [];
  const displayedPrompts = showAllPrompts ? filteredPrompts : filteredPrompts.slice(0, 6);
  const totalFilteredPrompts = filteredPrompts.length;


  const renderOutput = () => {
    switch (generationState) {
      case GenerationState.QUEUED:
        const position = queue.indexOf(visitorId) + 1;
        return (
          <div className="flex flex-col items-center justify-center text-center p-4 animate-fade-in w-full max-w-md">
            <div className="relative w-24 h-24 mb-4">
              <UsersIcon className="absolute inset-0 w-full h-full text-brand opacity-25" />
              <UsersIcon className="absolute inset-0 w-full h-full text-brand animate-pulse-slow" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">You're in the queue!</h2>
            {position > 0 ? (
                <p className="text-lg text-text-secondary mt-2">
                    Your position: <span className="font-bold text-brand-secondary">{position}</span> of {queue.length}
                </p>
            ) : (
                <p className="text-lg text-text-secondary mt-2">Getting ready to process...</p>
            )}
            <p className="text-sm text-text-secondary mt-1 max-w-xs">
              To provide a fair service, generations for free users are processed one at a time.
            </p>
             <button
                onClick={handleLeaveQueue}
                className="mt-6 px-6 py-2 bg-red-600/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-600/40 hover:text-red-300 transition-colors duration-200"
             >
                Leave Queue
             </button>
          </div>
        );
      case GenerationState.GENERATING_VIDEO:
        return <LoadingIndicator messages={VIDEO_LOADING_MESSAGES} IconComponent={VideoCameraIcon} />;
      case GenerationState.LOADING:
        return <LoadingIndicator />;
      case GenerationState.SUCCESS:
        if (generatedVideoUrl) {
            return <VideoPlayer videoUrl={generatedVideoUrl} />;
        }
        return generatedImageUrls && generatedImageUrls.length > 0 && <ImageDisplay imageUrls={generatedImageUrls} />;
      case GenerationState.ERROR:
        return (
          <div className="flex flex-col items-center justify-center text-center text-red-400 bg-red-900/20 p-8 rounded-lg">
            <h3 className="text-xl font-bold mb-2">Generation Failed</h3>
            <p>{error}</p>
          </div>
        );
      case GenerationState.IDLE:
      default:
        return (
          <div className="flex flex-col items-center justify-center text-center text-text-secondary">
            <div className="p-4 bg-panel-light rounded-full mb-4">
              { generationMode === 'video' ? <VideoCameraIcon className="w-16 h-16 text-brand" /> : <PhotoIcon className="w-16 h-16 text-brand" /> }
            </div>
            <h2 className="text-2xl font-bold text-text-primary">{ generationMode === 'video' ? 'Ready to Create a Video?' : 'Ready to Transform Your Photo?' }</h2>
            <p>{ generationMode === 'video' ? 'Describe the scene you want to bring to life.' : 'Upload a clear photo and describe the result you want.'}</p>
          </div>
        );
    }
  };

  const renderGenerationButtonMessage = () => {
    if (isQueued) return 'You are in line';
    if (generationState === GenerationState.LOADING) return 'Generating Your Portrait...';
    if (generationState === GenerationState.GENERATING_VIDEO) return 'Generating Your Video...';
    if (generationMode === 'single' && !session && (isSystemBusy || queue.length > 0)) return `Join Queue (${queue.length} waiting)`;

    if (generationMode === 'video') {
        if ((currentCredits ?? 0) < VIDEO_CREDIT_COST) return 'Not Enough Credits';
        return `Generate Video (${VIDEO_CREDIT_COST} Credits)`;
    }
    
    if ((currentCredits ?? 0) < IMAGE_CREDIT_COST) return 'Out of Credits';
    return `Generate Image (${IMAGE_CREDIT_COST} Credits)`;
  };
  
  const renderCreditWarning = () => {
    if ((currentCredits ?? 0) >= 1 || isGenerating || isQueued) return null;
    const freePlan = plans.find(p => p.name === 'free');
    const freeCredits = freePlan ? freePlan.credits_per_month : 80;

    if (session && profile) {
        return <p className="text-amber-400 text-sm text-center mt-3">You're out of credits. Your credits will renew monthly.</p>;
    } else {
        return (
            <p className="text-amber-400 text-sm text-center mt-3">
                You've used your trial credits. <button onClick={() => setAuthModalView('sign_up')} className="font-bold underline hover:text-amber-300">Sign Up</button> to get {freeCredits} free credits!
            </p>
        );
    }
  };

  const proPlan = plans.find(p => p.name === 'pro');

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans">
      {authModalView && (
        <Auth 
            initialView={authModalView}
            onClose={() => setAuthModalView(null)}
        />
      )}
      {isContactModalOpen && (
        <ContactModal 
            onClose={() => setIsContactModalOpen(false)}
            session={session}
            profile={profile}
        />
      )}
      {isAdminPanelOpen && profile?.role === 'admin' && (
        <AdminPanel
          allUsers={allUsers}
          plans={plans}
          prompts={examplePrompts}
          paymentSettings={paymentSettings}
          planCountryPrices={planCountryPrices}
          appSettings={appSettings}
          coupons={coupons}
          onAddPrompt={handleAddPrompt}
          onRemovePrompt={handleRemovePrompt}
          onUpdatePrompt={handleUpdatePrompt}
          onUpdateUser={handleAdminUpdateUser}
          onDeleteUser={handleAdminDeleteUser}
          onUpdatePlan={handleAdminUpdatePlan}
          onUpdatePaymentSettings={handleAdminUpdatePaymentSettings}
          onAddPlanCountryPrice={handleAdminAddPlanCountryPrice}
          onUpdatePlanCountryPrice={handleAdminUpdatePlanCountryPrice}
          onDeletePlanCountryPrice={handleAdminDeletePlanCountryPrice}
          onUpdateAppSettings={handleAdminUpdateAppSettings}
          onAddCoupon={handleAdminAddCoupon}
          onUpdateCoupon={handleAdminUpdateCoupon}
          onDeleteCoupon={handleAdminDeleteCoupon}
          onClose={() => setIsAdminPanelOpen(false)}
        />
      )}
      {isMembershipModalOpen && proPlan && (
        <MembershipModal
            plan={proPlan}
            onClose={() => setIsMembershipModalOpen(false)}
            onUpgrade={handleUpgradeToPro}
            country={profile?.country}
            paymentSettings={paymentSettings}
            profile={profile}
        />
      )}
      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <Header
          session={session}
          profile={profile}
          visitorProfile={visitorProfile}
          proPlan={proPlan}
          onSignUpClick={handleSignUpClick}
          onLoginClick={() => setAuthModalView('sign_in')}
          onUpgradeClick={() => setIsMembershipModalOpen(true)}
          onAdminPanelClick={() => setIsAdminPanelOpen(prev => !prev)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="bg-panel p-6 rounded-2xl border border-border flex flex-col">
             <div className="flex border-b border-border mb-6">
                <button
                    onClick={() => handleModeChange('single')}
                    className={`px-6 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${
                    generationMode === 'single'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                >
                    Single Person
                </button>
                <button
                    onClick={() => handleModeChange('multi')}
                    className={`px-6 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${
                    generationMode === 'multi'
                        ? 'border-brand text-brand'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                >
                    Multi-person
                </button>
                {profile?.role === 'admin' && (
                    <button
                        onClick={() => handleModeChange('video')}
                        className={`px-6 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${
                        generationMode === 'video'
                            ? 'border-brand text-brand'
                            : 'border-transparent text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        Video
                    </button>
                )}
            </div>

            <div className="flex-grow space-y-8">
              {/* Step 1 */}
              <div className="flex flex-col space-y-3">
                 <div className="flex items-center gap-3">
                   <div className="flex items-center justify-center w-8 h-8 rounded-full bg-panel-light text-brand font-bold text-sm">1</div>
                   <h2 className="text-xl font-bold text-text-primary">
                    {generationMode === 'multi' ? 'Upload First Person' : (generationMode === 'video' ? 'Upload Reference Photo (Optional)' : 'Upload Base Photo')}
                   </h2>
                 </div>
                <ImageUploader 
                  onImageChange={handleImageChange}
                  imageDataUrl={imageDataUrl}
                  disabled={isGenerating || isQueued}
                />
              </div>

              {generationMode === 'multi' && (
                <div className="flex flex-col space-y-3 animate-fade-in">
                    <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-panel-light text-brand font-bold text-sm">2</div>
                    <h2 className="text-xl font-bold text-text-primary">Upload Second Person</h2>
                    </div>
                    <ImageUploader 
                    onImageChange={handleImageTwoChange}
                    imageDataUrl={imageDataUrlTwo}
                    disabled={isGenerating || isQueued}
                    />
                </div>
              )}

              {/* Get Prompt from Image (Single Person Only) */}
              {generationMode === 'single' && (
                <div className="flex flex-col space-y-3">
                    <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-panel-light text-brand font-bold text-sm">2</div>
                    <h2 className="text-xl font-bold text-text-primary">Get Prompt from Image <span className="text-sm text-text-secondary">(Optional)</span></h2>
                    </div>
                    <div className="ml-11">
                    <p className="text-sm text-text-secondary -mt-2">Let AI describe an image to generate a new prompt.</p>
                    <div className="flex flex-col gap-4 mt-3">
                        <ImageUploader 
                            onImageChange={handlePromptGenImageChange}
                            imageDataUrl={promptGenImageDataUrl}
                            disabled={isGenerating || isQueued || isGeneratingPrompt}
                        />
                        <div className="space-y-3 p-3 bg-background rounded-lg border border-border">
                            <p className="text-sm font-semibold text-text-secondary">Advanced Options</p>
                            <div>
                                <label className="text-xs text-text-secondary font-medium">Describe these elements:</label>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
                                    {Object.keys(promptFocus).map((key) => {
                                        const focusKey = key as keyof typeof promptFocus;
                                        const label = { realism: 'Realism & Detail', style: 'Style & Mood', background: 'Background & Setting', clothing: 'Clothing & Attire', lighting: 'Lighting Details' }[focusKey];
                                        return (
                                            <div key={key} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`focus-${key}`}
                                                    checked={promptFocus[focusKey]}
                                                    onChange={(e) => setPromptFocus(prev => ({...prev, [key]: e.target.checked }))}
                                                    className="w-4 h-4 bg-background border-border rounded text-brand focus:ring-brand focus:ring-2 disabled:opacity-50"
                                                    disabled={isGenerating || isQueued || isGeneratingPrompt}
                                                />
                                                <label htmlFor={`focus-${key}`} className="text-sm text-text-secondary select-none cursor-pointer">{label}</label>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="keywords" className="text-xs text-text-secondary font-medium">Incorporate Keywords (optional):</label>
                                <input
                                    id="keywords"
                                    type="text"
                                    value={promptKeywords}
                                    onChange={(e) => setPromptKeywords(e.target.value)}
                                    placeholder="e.g., cinematic, realism, real life"
                                    className="w-full mt-1 p-2 bg-panel-light border border-border rounded-lg focus:ring-1 focus:ring-brand text-sm"
                                    disabled={isGenerating || isQueued || isGeneratingPrompt}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleGeneratePromptFromImage}
                            disabled={isGenerating || isQueued || isGeneratingPrompt || !promptGenImage || (currentCredits ?? 0) < PROMPT_CREDIT_COST}
                            className="w-full flex items-center justify-center py-3 px-4 bg-panel-light text-text-primary font-semibold rounded-lg shadow-md hover:bg-border transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <PhotoIcon className="w-5 h-5 mr-2" />
                            {isGeneratingPrompt ? `Analyzing... (${PROMPT_CREDIT_COST} Credit)` : `Generate Prompt (${PROMPT_CREDIT_COST} Credit)`}
                        </button>
                    </div>
                    </div>
                </div>
               )}

              {/* Prompt Text Area */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center gap-3">
                   <div className="flex items-center justify-center w-8 h-8 rounded-full bg-panel-light text-brand font-bold text-sm">{generationMode === 'multi' ? '3' : '2'}</div>
                   <h2 className="text-xl font-bold text-text-primary">{generationMode === 'video' ? 'Describe the Video' : 'Describe the Transformation'}</h2>
                 </div>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={generationMode === 'video' ? "e.g., A neon hologram of a cat driving at top speed" : "e.g., A professional corporate headshot, wearing a dark suit..."}
                  className="w-full h-36 p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition duration-200 resize-none placeholder-text-secondary"
                  disabled={isGenerating || isQueued}
                />
              </div>
               
               {/* Examples Section */}
               <div className="flex flex-col space-y-4">
                <p className="text-md font-semibold text-text-secondary">Or try an example:</p>
                
                <div className="mb-1">
                  <input
                    type="text"
                    value={promptSearch}
                    onChange={(e) => setPromptSearch(e.target.value)}
                    placeholder="Search examples..."
                    className="w-full p-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand focus:border-brand transition duration-200 placeholder-text-secondary"
                    disabled={isGenerating || isQueued || promptsLoading || examplePrompts.length === 0}
                  />
                </div>

                {promptsLoading ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 pb-3 border-b border-border">
                            <div className="h-9 bg-panel-light rounded-lg animate-pulse"></div>
                            <div className="h-9 bg-panel-light rounded-lg animate-pulse"></div>
                            <div className="h-9 bg-panel-light rounded-lg animate-pulse"></div>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="aspect-square bg-panel-light rounded-lg animate-pulse"></div>
                            ))}
                        </div>
                    </div>
                ) : examplePrompts.length > 0 ? (
                    <>
                        <div className="grid grid-cols-3 gap-2 pb-3 border-b border-border">
                        {examplePrompts.map((category) => (
                            <button
                            key={category.id}
                            onClick={() => handleCategoryClick(category.title)}
                            disabled={isGenerating || isQueued}
                            className={`flex items-center justify-center text-center p-2 rounded-lg border text-xs font-medium transition-colors duration-200 disabled:opacity-50 ${
                                selectedCategory === category.title
                                ? 'bg-brand/10 border-brand text-brand'
                                : 'bg-panel-light border-border text-text-secondary hover:border-brand/50 hover:text-text-primary'
                            }`}
                            >
                            {category.title}
                            </button>
                        ))}
                        </div>

                        {filteredPrompts.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {displayedPrompts.map((p) => {
                            const { text, imageUrl } = p;

                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleExampleClick(p)}
                                    disabled={isGenerating || isQueued}
                                    className="group aspect-square bg-panel-light rounded-lg overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel focus:ring-brand disabled:opacity-50 transition-all duration-200 hover:scale-[1.03] disabled:transform-none"
                                    title={text}
                                >
                                {imageUrl ? (
                                    <div className="relative w-full h-full">
                                    <img src={imageUrl} alt={text} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                    <p className="absolute bottom-0 left-0 right-0 p-2 text-xs text-white font-medium leading-tight">
                                        {text.length > 60 ? text.substring(0, 60) + '...' : text}
                                    </p>
                                    </div>
                                ) : (
                                    <div className="p-2 flex items-center justify-center h-full bg-background group-hover:bg-border transition-colors duration-200">
                                    <p className="text-xs text-text-secondary font-medium text-center">
                                        {text.length > 90 ? text.substring(0, 90) + '...' : text}
                                    </p>
                                    </div>
                                )}
                                </button>
                            )
                            })}
                        </div>
                        ) : (
                        <p className="text-text-secondary text-sm px-2">No examples match your search.</p>
                        )}

                        {totalFilteredPrompts > 6 && (
                        <button
                            onClick={() => setShowAllPrompts(!showAllPrompts)}
                            className="text-sm text-brand hover:underline mt-2"
                        >
                            {showAllPrompts ? 'Show Less' : `Show More (${totalFilteredPrompts - 6} more)`}
                        </button>
                        )}
                    </>
                ) : (
                    <p className="text-text-secondary text-sm px-2 text-center py-4">No examples currently available.</p>
                )}
              </div>
            </div>

            <div className="pt-6 mt-auto border-t border-border">
               {generationMode === 'single' && !session && (isSystemBusy || queue.length > 0) && !isQueued && (
                <div className="flex items-center justify-center gap-2 text-sm text-brand-secondary mb-3 animate-fade-in">
                    <UsersIcon className="w-5 h-5 animate-pulse" />
                    <span>System is busy. Join the queue to generate.</span>
                </div>
              )}
              {/* Generation Controls */}
              {generationMode !== 'video' && (
                <>
                <div className="mb-4">
                    <label className="text-sm font-semibold text-text-secondary mb-2 block text-center">Image Size</label>
                    <div className="flex bg-background rounded-lg p-1 border border-border w-full max-w-xs mx-auto">
                        <button
                            onClick={() => setImageSize('1024')}
                            disabled={isGenerating || isQueued}
                            className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${imageSize === '1024' ? 'bg-panel-light text-text-primary shadow' : 'text-text-secondary hover:bg-border'}`}
                        >
                            Standard <span className="text-xs text-text-tertiary">(1024px)</span>
                        </button>
                        <button
                            onClick={() => {
                                if (profile?.plan === 'pro') {
                                    setImageSize('2048');
                                } else {
                                    if (session) {
                                        setIsMembershipModalOpen(true);
                                    } else {
                                        setAuthModalView('sign_up');
                                    }
                                }
                            }}
                            disabled={isGenerating || isQueued}
                            className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors relative flex items-center justify-center gap-1.5 disabled:opacity-50 ${imageSize === '2048' && profile?.plan === 'pro' ? 'bg-brand-secondary text-background shadow' : 'text-text-secondary hover:bg-border'} ${profile?.plan !== 'pro' ? 'cursor-pointer' : ''}`}
                            title={profile?.plan !== 'pro' ? 'Upgrade to Pro for HD Images' : 'Select HD Image Size'}
                        >
                            HD <span className="text-xs text-text-tertiary">(2048px)</span>
                            {profile?.plan !== 'pro' && (
                                <span className="absolute -top-2 -right-2 flex items-center gap-1 px-1.5 py-0.5 bg-brand-secondary text-background font-bold rounded-full text-[10px] leading-none">
                                    <StarIcon className="w-2.5 h-2.5" />
                                    PRO
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                <div className="mb-4">
                    <label id="aspect-ratio-label" className="text-sm font-semibold text-text-secondary mb-2 block text-center">Aspect Ratio</label>
                    <div role="group" aria-labelledby="aspect-ratio-label" className="grid grid-cols-5 gap-1 bg-background rounded-lg p-1 border border-border w-full max-w-xs mx-auto">
                        {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map(ratio => {
                            const isProFeature = ratio !== '1:1';
                            const canUseFeature = profile?.plan === 'pro' || !isProFeature;

                            return (
                            <button
                                key={ratio}
                                onClick={() => {
                                    if (canUseFeature) {
                                        setAspectRatio(ratio);
                                    } else {
                                        if (session) {
                                            setIsMembershipModalOpen(true);
                                        } else {
                                            setAuthModalView('sign_up');
                                        }
                                    }
                                }}
                                disabled={isGenerating || isQueued}
                                className={`relative w-full py-2 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 ${aspectRatio === ratio && canUseFeature ? 'bg-panel-light text-text-primary shadow' : 'text-text-secondary hover:bg-border'}`}
                                aria-pressed={aspectRatio === ratio && canUseFeature}
                                title={!canUseFeature ? 'Upgrade to Pro for different aspect ratios' : `Set aspect ratio to ${ratio}`}
                            >
                                {ratio}
                                {!canUseFeature && (
                                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center p-0.5 bg-brand-secondary text-background font-bold rounded-full text-[9px] leading-none">
                                        <StarIcon className="w-2.5 h-2.5" />
                                    </span>
                                )}
                            </button>
                            );
                        })}
                    </div>
                </div>
                </>
              )}
              <button
                onClick={generationMode === 'video' ? handleGenerateVideo : (generationMode === 'multi' ? handleGenerateMultiPersonImage : handleGenerateImage)}
                disabled={isGenerating || isQueued || 
                    (generationMode === 'video' && (!prompt.trim() || (currentCredits ?? 0) < VIDEO_CREDIT_COST || !session)) ||
                    (generationMode === 'single' && (!prompt.trim() || !imageDataUrl || (currentCredits ?? 0) < IMAGE_CREDIT_COST)) ||
                    (generationMode === 'multi' && (!prompt.trim() || !imageDataUrl || !imageDataUrlTwo || (currentCredits ?? 0) < IMAGE_CREDIT_COST))
                }
                className="w-full flex items-center justify-center py-4 px-6 bg-brand text-white font-bold rounded-lg shadow-lg hover:bg-brand-hover transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                <SparklesIcon className="w-6 h-6 mr-2" />
                {renderGenerationButtonMessage()}
              </button>
              {renderCreditWarning()}
              {error && generationState !== GenerationState.LOADING && generationState !== GenerationState.QUEUED && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-panel p-6 rounded-2xl border border-border flex items-center justify-center min-h-[400px] lg:min-h-0">
            <div className="w-full h-full flex items-center justify-center">
              {renderOutput()}
            </div>
          </div>
        </div>

        {plans.length > 0 && (
          <PricingTable 
            ref={pricingTableRef}
            plans={plans}
            session={session}
            profile={profile}
            onSelectPlan={handlePlanSelection}
            country={profile?.country}
            planCountryPrices={planCountryPrices}
          />
        )}
        
        {historyImageUrls.length > 0 && (
          <HistoryDisplay
            imageUrls={historyImageUrls}
            onClear={handleClearHistory}
          />
        )}

        <Footer onContactClick={() => setIsContactModalOpen(true)} />
      </main>
      
      {isChatOpen && profile && (
        <ChatBox
            messages={chatMessages}
            isLoading={isChatLoading}
            error={chatError}
            profile={profile}
            onClose={() => setIsChatOpen(false)}
            onSendMessage={handleSendMessage}
            chatCreditCost={CHAT_CREDIT_COST}
        />
      )}
      
      <button
        onClick={handleToggleChat}
        className="fixed bottom-6 right-6 bg-brand text-white p-4 rounded-full shadow-lg hover:bg-brand-hover transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-brand"
        aria-label="Open AI Assistant"
        title="AI Assistant"
      >
        <ChatBubbleLeftRightIcon className="w-7 h-7" />
      </button>

    </div>
  );
};

export default App;