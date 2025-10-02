import React, { useState } from 'react';
import { UserProfile, GraphicSuiteTool, ArchitectureSuiteTool } from '../types';
import {
  UserCircleIcon,
  UsersIcon,
  WandIcon,
  PaintBrushIcon,
  ClockRewindIcon,
  VideoCameraIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  CubeTransparentIcon,
  StarIcon,
  PhotoIcon,
  VectorSquareIcon,
  ArrowsPointingOutIcon,
  ScissorsIcon,
  GlobeAltIcon,
  SwatchIcon,
  Squares2X2Icon,
  SparklesIcon,
  HomeModernIcon,
} from './Icons';

type GenerationMode = 'single' | 'multi' | 'video' | 'past_forward' | 'restore' | 'graphic_suite' | 'architecture_suite';


interface SidebarProps {
  generationMode: GenerationMode;
  graphicSuiteTool: GraphicSuiteTool;
  onModeChange: (mode: GenerationMode) => void;
  onGraphicToolChange: (tool: GraphicSuiteTool) => void;
  architectureSuiteTool: ArchitectureSuiteTool;
  onArchitectureToolChange: (tool: ArchitectureSuiteTool) => void;
  profile: UserProfile | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  // FIX: Added missing onGoHome prop to the interface.
  onGoHome: () => void;
}

const NavButton = ({
  icon,
  label,
  mode,
  currentMode,
  onClick,
  disabled = false,
  isCollapsed,
}: {
  icon: React.ReactNode;
  label: string;
  mode: GenerationMode;
  currentMode: string;
  onClick: (mode: GenerationMode) => void;
  disabled?: boolean;
  isCollapsed: boolean;
}) => (
  <button
    onClick={() => onClick(mode)}
    disabled={disabled}
    className={`flex items-center w-full p-3 my-1 rounded-lg text-left transition-colors duration-200 ${
      currentMode === mode
        ? 'bg-brand text-white'
        : 'text-text-secondary hover:bg-panel-light hover:text-text-primary'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isCollapsed ? 'justify-center' : ''}`}
    aria-current={currentMode === mode ? 'page' : undefined}
    title={label}
  >
    <div className={`w-6 h-6 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'mr-0' : 'mr-4'}`}>{icon}</div>
    <span className={`font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>{label}</span>
  </button>
);

// FIX: Refactored GraphicToolButton to use a defined props interface and React.FC.
// This resolves a TypeScript error where the special 'key' prop in a map was being
// incorrectly checked against the component's props.
interface GraphicToolButtonProps {
  icon: React.ReactNode;
  label: string;
  tool: GraphicSuiteTool;
  isActive: boolean;
  onClick: (tool: GraphicSuiteTool) => void;
  isCollapsed: boolean;
}

const GraphicToolButton: React.FC<GraphicToolButtonProps> = ({
  icon,
  label,
  tool,
  isActive,
  onClick,
  isCollapsed,
}) => (
  <button
    onClick={() => onClick(tool)}
    className={`flex items-center w-full p-3 my-1 rounded-lg text-left transition-colors duration-200 ${
      isActive
        ? 'bg-brand text-white'
        : 'text-text-secondary hover:bg-panel-light hover:text-text-primary'
    } ${isCollapsed ? 'justify-center' : ''}`}
    title={label}
  >
    <div className={`w-6 h-6 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'mr-0' : 'mr-4'}`}>{icon}</div>
    <span className={`font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>{label}</span>
  </button>
);

interface ArchitectureToolButtonProps {
  icon: React.ReactNode;
  label: string;
  tool: ArchitectureSuiteTool;
  isActive: boolean;
  onClick: (tool: ArchitectureSuiteTool) => void;
  isCollapsed: boolean;
}

const ArchitectureToolButton: React.FC<ArchitectureToolButtonProps> = ({
  icon,
  label,
  tool,
  isActive,
  onClick,
  isCollapsed,
}) => (
  <button
    onClick={() => onClick(tool)}
    className={`flex items-center w-full p-3 my-1 rounded-lg text-left transition-colors duration-200 ${
      isActive
        ? 'bg-brand text-white'
        : 'text-text-secondary hover:bg-panel-light hover:text-text-primary'
    } ${isCollapsed ? 'justify-center' : ''}`}
    title={label}
  >
    <div className={`w-6 h-6 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'mr-0' : 'mr-4'}`}>{icon}</div>
    <span className={`font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>{label}</span>
  </button>
);


const Sidebar: React.FC<SidebarProps> = ({ generationMode, graphicSuiteTool, onModeChange, onGraphicToolChange, profile, isCollapsed, onToggleCollapse, isMobileOpen, onMobileClose, onGoHome, architectureSuiteTool, onArchitectureToolChange }) => {
  const [isPortraitSuiteOpen, setIsPortraitSuiteOpen] = useState(true);
  const [isGraphicSuiteOpen, setIsGraphicSuiteOpen] = useState(true);
  const [isArchitectureSuiteOpen, setIsArchitectureSuiteOpen] = useState(true);

  const handleModeClick = (mode: GenerationMode) => {
    onModeChange(mode);
    onMobileClose();
  };

  const handleGraphicToolClick = (tool: GraphicSuiteTool) => {
    onGraphicToolChange(tool);
    onMobileClose();
  };
  
  const handleArchitectureToolClick = (tool: ArchitectureSuiteTool) => {
    onArchitectureToolChange(tool);
    onMobileClose();
  };

  const graphicTools: { tool: GraphicSuiteTool, label: string, icon: React.ReactNode }[] = [
      { tool: 'logo_maker', label: 'Logo Maker', icon: <SparklesIcon className="w-6 h-6" /> },
      { tool: 'asset_generator', label: 'Asset Generator', icon: <PhotoIcon className="w-6 h-6" /> },
      { tool: 'photo_editor', label: 'Photo Editor', icon: <PaintBrushIcon className="w-6 h-6" /> },
      { tool: 'upscale', label: 'Upscale Image', icon: <ArrowsPointingOutIcon className="w-6 h-6" /> },
      { tool: 'remove_background', label: 'Remove Background', icon: <ScissorsIcon className="w-6 h-6" /> },
      { tool: 'replace_background', label: 'Replace Background', icon: <GlobeAltIcon className="w-6 h-6" /> },
      { tool: 'colorize', label: 'Colorize Photo', icon: <SwatchIcon className="w-6 h-6" /> },
  ];
  
  const architectureTools: { tool: ArchitectureSuiteTool, label: string, icon: React.ReactNode }[] = [
      { tool: 'exterior', label: 'Exterior Design', icon: <HomeModernIcon className="w-6 h-6" /> },
      { tool: 'interior', label: 'Interior Design', icon: <PhotoIcon className="w-6 h-6" /> },
      { tool: 'landscape', label: 'Landscape Design', icon: <GlobeAltIcon className="w-6 h-6" /> },
  ];

  return (
    <aside className={`bg-panel border-r border-border p-4 flex flex-col fixed lg:relative inset-y-0 left-0 z-50 w-64 lg:w-auto transition-transform lg:transition-all duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isCollapsed ? 'lg:w-24' : 'lg:w-64'}`}>
      {/* FIX: Made the logo a clickable button to go home */}
      <button onClick={onGoHome} className="flex flex-col items-center text-center mb-4 w-full">
        <img 
            src="https://zsdecor.pk/wp-content/uploads/2025/09/1.png" 
            alt="BestAI Logo" 
            className="h-10 w-auto"
        />
      </button>
      <nav className="flex-grow overflow-y-auto">
         <button
          onClick={() => setIsPortraitSuiteOpen(!isPortraitSuiteOpen)}
          className={`flex items-center justify-between w-full p-3 my-1 rounded-lg text-left transition-colors duration-200 text-text-primary hover:bg-panel-light`}
          aria-expanded={isPortraitSuiteOpen}
        >
          <div className="flex items-center">
             <PaintBrushIcon className={`w-6 h-6 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'mr-0' : 'mr-4'}`} />
             <span className={`font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>Portrait Suite</span>
          </div>
          <ChevronDownIcon className={`w-5 h-5 text-text-secondary transition-transform duration-300 ${!isPortraitSuiteOpen ? '-rotate-90' : ''} ${isCollapsed ? 'hidden' : ''}`} />
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isPortraitSuiteOpen ? 'max-h-96' : 'max-h-0'}`}>
          <div className={`transition-all duration-300 ease-in-out ${!isCollapsed ? 'pl-4 border-l-2 border-border ml-4' : 'flex flex-col items-center'}`}>
            <NavButton
              icon={<UserCircleIcon className="w-6 h-6" />}
              label="Single Person"
              mode="single"
              currentMode={generationMode}
              onClick={handleModeClick}
              isCollapsed={isCollapsed}
            />
            <NavButton
              icon={<UsersIcon className="w-6 h-6" />}
              label="Multi-person"
              mode="multi"
              currentMode={generationMode}
              onClick={handleModeClick}
              isCollapsed={isCollapsed}
            />
            <NavButton
              icon={<WandIcon className="w-6 h-6" />}
              label="Restore"
              mode="restore"
              currentMode={generationMode}
              onClick={handleModeClick}
              isCollapsed={isCollapsed}
            />
            <NavButton
              icon={<ClockRewindIcon className="w-6 h-6" />}
              label="Past Forward"
              mode="past_forward"
              currentMode={generationMode}
              onClick={handleModeClick}
              isCollapsed={isCollapsed}
            />
          </div>
        </div>
        
        <button
          onClick={() => setIsGraphicSuiteOpen(!isGraphicSuiteOpen)}
          className={`flex items-center justify-between w-full p-3 my-1 rounded-lg text-left transition-colors duration-200 text-text-primary hover:bg-panel-light`}
          aria-expanded={isGraphicSuiteOpen}
        >
          <div className="flex items-center">
             <CubeTransparentIcon className={`w-6 h-6 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'mr-0' : 'mr-4'}`} />
             <span className={`font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>Graphic Suite</span>
          </div>
          <ChevronDownIcon className={`w-5 h-5 text-text-secondary transition-transform duration-300 ${!isGraphicSuiteOpen ? '-rotate-90' : ''} ${isCollapsed ? 'hidden' : ''}`} />
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isGraphicSuiteOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
          <div className={`transition-all duration-300 ease-in-out ${!isCollapsed ? 'pl-4 border-l-2 border-border ml-4' : 'flex flex-col items-center'}`}>
            {graphicTools.map(({ tool, label, icon }) => (
                <GraphicToolButton
                    key={tool}
                    icon={icon}
                    label={label}
                    tool={tool}
                    isActive={generationMode === 'graphic_suite' && graphicSuiteTool === tool}
                    onClick={handleGraphicToolClick}
                    isCollapsed={isCollapsed}
                />
            ))}
          </div>
        </div>

        <button
          onClick={() => setIsArchitectureSuiteOpen(!isArchitectureSuiteOpen)}
          className={`flex items-center justify-between w-full p-3 my-1 rounded-lg text-left transition-colors duration-200 text-text-primary hover:bg-panel-light`}
          aria-expanded={isArchitectureSuiteOpen}
        >
          <div className="flex items-center">
             <HomeModernIcon className={`w-6 h-6 flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'mr-0' : 'mr-4'}`} />
             <span className={`font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'}`}>Architecture Suite</span>
          </div>
          <ChevronDownIcon className={`w-5 h-5 text-text-secondary transition-transform duration-300 ${!isArchitectureSuiteOpen ? '-rotate-90' : ''} ${isCollapsed ? 'hidden' : ''}`} />
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isArchitectureSuiteOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
          <div className={`transition-all duration-300 ease-in-out ${!isCollapsed ? 'pl-4 border-l-2 border-border ml-4' : 'flex flex-col items-center'}`}>
            {architectureTools.map(({ tool, label, icon }) => (
                <ArchitectureToolButton
                    key={tool}
                    icon={icon}
                    label={label}
                    tool={tool}
                    isActive={generationMode === 'architecture_suite' && architectureSuiteTool === tool}
                    onClick={handleArchitectureToolClick}
                    isCollapsed={isCollapsed}
                />
            ))}
          </div>
        </div>

        {profile?.role === 'admin' && (
          <NavButton
            icon={<VideoCameraIcon className="w-6 h-6" />}
            label="Video (Admin)"
            mode="video"
            currentMode={generationMode}
            onClick={handleModeClick}
            isCollapsed={isCollapsed}
          />
        )}
      </nav>
      <div className="mt-auto">
        <div className={`text-center text-xs text-text-tertiary whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 max-h-0' : 'opacity-100 max-h-10'}`}>
            <p>&copy; {new Date().getFullYear()} BestAI</p>
            <p>Powered by 🇵🇰</p>
        </div>
      </div>
      <button 
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 items-center justify-center bg-panel-light text-text-secondary rounded-full border border-border hover:bg-border hover:text-text-primary transition-all duration-300 z-10"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
          <ChevronLeftIcon className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
      </button>
    </aside>
  );
};

export default Sidebar;