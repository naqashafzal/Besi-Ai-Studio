import React, { useState, useRef, useEffect } from 'react';
import { Plan, Session, UserProfile, PlanCountryPrice } from '../types';
import PricingTable from './PricingTable';
import Footer from './Footer';
import { 
    SparklesIcon, 
    PaintBrushIcon, 
    CubeTransparentIcon, 
    HomeModernIcon,
    UsersIcon,
    ClockRewindIcon,
    WandIcon,
    ArrowsPointingOutIcon,
    ScissorsIcon,
    GlobeAltIcon,
    PhotoIcon,
    ArrowsRightLeftIcon,
} from './Icons';

interface LandingPageProps {
  onLaunch: () => void;
  onLoginClick: () => void;
  onContactClick: () => void;
  pricingTableRef: React.RefObject<HTMLElement>;
  plans: Plan[];
  session: Session | null;
  profile: UserProfile | null;
  onSelectPlan: (planName: string) => void;
  country?: string | null;
  planCountryPrices: PlanCountryPrice[];
  initialScrollTarget: 'pricing' | null;
  onScrollComplete: () => void;
}

const FeatureListItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 text-brand mt-1">{icon}</div>
    <div>
      <h4 className="font-semibold text-text-primary">{title}</h4>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  </div>
);

const HowItWorksStep = ({ number, title, description }: { number: string; title: string; description: string }) => (
  <div className="text-center">
    <div className="flex items-center justify-center w-16 h-16 mx-auto bg-panel border-2 border-brand rounded-full text-brand text-2xl font-bold mb-4">
      {number}
    </div>
    <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
    <p className="text-text-secondary">{description}</p>
  </div>
);

const ImageComparisonSlider = ({ beforeImage, afterImage }: { beforeImage: string, afterImage: string }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current || !isDragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
  const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

  const handleMouseUp = () => {
    isDragging.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
  
  const handleTouchEnd = () => {
    isDragging.current = false;
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div 
        ref={containerRef} 
        className="relative w-full max-w-xl mx-auto aspect-[4/3] rounded-2xl overflow-hidden select-none group shadow-2xl border-2 border-border"
        onMouseMove={(e) => isDragging.current && handleMouseMove(e.nativeEvent)}
        onMouseLeave={handleMouseUp}
    >
      <img src={beforeImage} alt="Before" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
      <div 
        className="absolute inset-0 w-full h-full"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img src={afterImage} alt="After" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
      </div>
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white/50 backdrop-blur-sm cursor-ew-resize"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 bg-white/90 text-background rounded-full flex items-center justify-center shadow-lg cursor-ew-resize transition-transform duration-200 group-hover:scale-110"
        >
          <ArrowsRightLeftIcon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({
  onLaunch,
  onLoginClick,
  onContactClick,
  pricingTableRef,
  plans,
  session,
  profile,
  onSelectPlan,
  country,
  planCountryPrices,
  initialScrollTarget,
  onScrollComplete,
}) => {
    
    const scrollTo = (ref: React.RefObject<HTMLElement>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (initialScrollTarget === 'pricing' && pricingTableRef.current) {
          scrollTo(pricingTableRef);
          onScrollComplete();
        }
    }, [initialScrollTarget, onScrollComplete, pricingTableRef]);

    return (
      <div className="bg-background text-text-primary font-sans animate-fade-in">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <img src="https://zsdecor.pk/wp-content/uploads/2025/09/1.png" alt="BestAI Logo" className="h-10 w-auto" />
             </div>
             <nav className="hidden md:flex items-center gap-6">
                 <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-text-secondary hover:text-text-primary transition-colors">Features</button>
                 <button onClick={() => scrollTo(pricingTableRef)} className="text-text-secondary hover:text-text-primary transition-colors">Pricing</button>
                 <button onClick={onContactClick} className="text-text-secondary hover:text-text-primary transition-colors">Contact</button>
             </nav>
             <div className="hidden md:flex items-center gap-3">
                {session ? (
                    <button onClick={onLaunch} className="px-4 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover transition-colors">
                        Launch Studio
                    </button>
                ) : (
                    <>
                        <button onClick={onLoginClick} className="px-4 py-2 bg-panel-light text-text-primary font-semibold rounded-lg hover:bg-border transition-colors">
                            Login
                        </button>
                        <button onClick={() => scrollTo(pricingTableRef)} className="px-4 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover transition-colors">
                            Sign Up
                        </button>
                    </>
                )}
             </div>
             <div className="md:hidden">
                 <button onClick={onLaunch} className="px-4 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover transition-colors">
                    {session ? 'Launch Studio' : 'Launch App'}
                 </button>
             </div>
          </div>
        </header>

        {/* Hero Section */}
        <main>
            <section className="relative py-20 lg:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern bg-8 opacity-10"></div>
                <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-background to-transparent"></div>
                
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Column: Text Content */}
                        <div className="text-center lg:text-left">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter text-text-primary leading-tight">
                                Your Vision, Instantly Realized.
                            </h1>
                            <p className="mt-6 text-lg md:text-xl text-text-secondary max-w-lg mx-auto lg:mx-0">
                                The ultimate AI-powered creative suite. Generate professional headshots, transform architectural photos, create stunning graphics, and more.
                            </p>
                            <button onClick={onLaunch} className="mt-10 px-8 py-4 bg-brand text-white font-bold rounded-lg shadow-lg text-lg hover:bg-brand-hover transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 mx-auto lg:mx-0">
                                <SparklesIcon className="w-6 h-6" />
                                Launch Studio & Create for Free
                            </button>
                            <p className="mt-6 text-sm text-text-tertiary">Join thousands of creators transforming their ideas into reality.</p>
                        </div>

                        {/* Right Column: Image Slider */}
                        <div className="w-full">
                            <ImageComparisonSlider
                                beforeImage="https://scontent.flhe7-2.fna.fbcdn.net/v/t39.30808-6/545543848_24219463131072335_5912790439395453215_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=a5f93a&_nc_eui2=AeGb4RAgp-s6FZLVCSdndq_EtPAd5D8R2i208B3kPxHaLV-BQLKaYifbi1pOQgFkJSV1FppvW9lXaiqFWr5h8xQD&_nc_ohc=pMNX8zH-tFkQ7kNvwF95PWj&_nc_oc=AdmyD6meDkFJ22S3gu81PKDC1uCmvN15JHhBNO67M3ZM9kutla39A7VI4uH7UVRB3S8&_nc_zt=23&_nc_ht=scontent.flhe7-2.fna&_nc_gid=WbCcGdjwWIVXnou1A95YuA&oh=00_Afbx03rDq_vvTsVqRmjwbOfsW5kWCfbEFttIsr66iREI7w&oe=68E446C4"
                                afterImage="https://scontent.flhe3-1.fna.fbcdn.net/v/t39.30808-6/550319595_24306225175729463_4562942395625021833_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeHdNcUEfmYI4J8ruO9pmvMH0FiXRXfIEVDQWJdFd8gRUFTuyohDvXolAUdPdZopPK4QY88fXdzkiAs1qMDv0XqB&_nc_ohc=4wSBj9yunY8Q7kNvwFyufWM&_nc_oc=Adl_OT1FQKbMPD5KTSTc2ZZCJ7ZI5rmqCXNw22vh1LWqmwQN0qkH_bVsQ9xObNLuV1k&_nc_zt=23&_nc_ht=scontent.flhe3-1.fna&_nc_gid=gi0hH2G7uFOXns8BbSAbxw&oh=00_AfZKdxmdU5JP4RCIMieq4jAn0KYGCsgky_gBoDsQxiYrQQ&oe=68E444F3"
                            />
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Features Section */}
            <section id="features" className="py-20 md:py-28 bg-panel border-y border-border">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-text-primary">
                            A Full Creative Suite
                        </h2>
                        <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
                            From portraits to logos, our AI tools are designed for every creative need.
                        </p>
                    </div>
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Portrait Suite */}
                        <div className="lg:col-span-1 bg-panel-light p-8 rounded-2xl border border-border">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex items-center justify-center w-12 h-12 bg-background text-brand rounded-xl">
                                    <PaintBrushIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-text-primary">Portrait Suite</h3>
                                    <p className="text-text-secondary">Craft perfect portraits.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <FeatureListItem
                                    icon={<UsersIcon className="w-5 h-5" />}
                                    title="Single & Multi-Person"
                                    description="Transform single photos with creative styles or combine people from multiple images into one seamless scene."
                                />
                                <FeatureListItem
                                    icon={<ClockRewindIcon className="w-5 h-5" />}
                                    title="Past Forward"
                                    description="Travel through time by reimagining your portrait in the styles of different decades."
                                />
                                <FeatureListItem
                                    icon={<WandIcon className="w-5 h-5" />}
                                    title="Photo Restoration"
                                    description="Breathe new life into old photos. Enhance faces, remove scratches, and colorize B&W images."
                                />
                                <FeatureListItem
                                    icon={<SparklesIcon className="w-5 h-5" />}
                                    title="Advanced Control"
                                    description="Use Canny Edges for strict pose replication and Fidelity mode for subtle, true-to-life edits."
                                />
                            </div>
                        </div>

                        {/* Graphic & Architecture Suites */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Graphic Suite */}
                            <div className="bg-panel-light p-8 rounded-2xl border border-border">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="flex items-center justify-center w-12 h-12 bg-background text-brand rounded-xl">
                                        <CubeTransparentIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-text-primary">Graphic Suite</h3>
                                        <p className="text-text-secondary">Design with AI.</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                     <FeatureListItem
                                        icon={<PhotoIcon className="w-5 h-5" />}
                                        title="Asset Generation"
                                        description="Instantly create unique illustrations, icons, and seamless patterns from text."
                                    />
                                    <FeatureListItem
                                        icon={<PaintBrushIcon className="w-5 h-5" />}
                                        title="Advanced Photo Editor"
                                        description="Use generative fill with masking to add, remove, or change parts of your image."
                                    />
                                    <FeatureListItem
                                        icon={<ScissorsIcon className="w-5 h-5" />}
                                        title="Background Tools"
                                        description="Automatically remove or replace the background of any photo with a new scene."
                                    />
                                    <FeatureListItem
                                        icon={<ArrowsPointingOutIcon className="w-5 h-5" />}
                                        title="Image Upscaling (Pro)"
                                        description="Increase image resolution up to 4K, enhancing clarity and detail for professional use."
                                    />
                                </div>
                            </div>

                            {/* Architecture Suite */}
                            <div className="bg-panel-light p-8 rounded-2xl border border-border">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="flex items-center justify-center w-12 h-12 bg-background text-brand rounded-xl">
                                        <HomeModernIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-text-primary">Architecture Suite</h3>
                                        <p className="text-text-secondary">Visualize spaces.</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                     <FeatureListItem
                                        icon={<PaintBrushIcon className="w-5 h-5" />}
                                        title="Sketch to Reality"
                                        description="Transform architectural line drawings into photorealistic renderings with detailed prompts."
                                    />
                                     <FeatureListItem
                                        icon={<SparklesIcon className="w-5 h-5" />}
                                        title="One-Click Enhancements"
                                        description="Instantly change your designs from day to night or cycle through all four seasons."
                                    />
                                    <FeatureListItem
                                        icon={<HomeModernIcon className="w-5 h-5" />}
                                        title="Interior & Exterior Design"
                                        description="Reimagine any room or building facade by providing a photo and describing a new style."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* How It Works Section */}
            <section id="how-it-works" className="py-20 md:py-28">
                 <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-text-primary">
                           Create in 3 Simple Steps
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-12">
                        <HowItWorksStep 
                            number="1"
                            title="Upload"
                            description="Start with your own photo, sketch, or design."
                        />
                         <HowItWorksStep 
                            number="2"
                            title="Describe"
                            description="Tell the AI your vision with a detailed text prompt."
                        />
                         <HowItWorksStep 
                            number="3"
                            title="Generate"
                            description="Watch as the AI brings your ideas to life in seconds."
                        />
                    </div>
                </div>
            </section>
            
            {/* Pricing Section */}
            <PricingTable 
                ref={pricingTableRef}
                plans={plans}
                session={session}
                profile={profile}
                onSelectPlan={onSelectPlan}
                country={country}
                planCountryPrices={planCountryPrices}
            />

            {/* Final CTA */}
            <section className="py-20 md:py-28 border-t border-border">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-text-primary">
                        Ready to Start Creating?
                    </h2>
                     <button onClick={onLaunch} className="mt-10 px-8 py-4 bg-brand text-white font-bold rounded-lg shadow-lg text-lg hover:bg-brand-hover transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 mx-auto">
                        <SparklesIcon className="w-6 h-6" />
                        Launch the Studio
                    </button>
                </div>
            </section>
        </main>

        <Footer onContactClick={onContactClick} />
      </div>
    );
};

export default LandingPage;