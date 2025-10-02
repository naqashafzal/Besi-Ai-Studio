import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, TrashIcon, ArrowsPointingOutIcon, AdjustmentsHorizontalIcon, CropIcon, StarIcon, ChevronLeftIcon, WandIcon, TriangleIcon } from './Icons';
import { GenerativePart } from '../types';
// FIX: Corrected typo in imported function name.
import { dataUrlToFile, fileToGenerativePart } from '../utils/fileHelpers';

interface ImageEditorCanvasProps {
  imageDataUrl: string;
  brushSize: number;
}

export interface ImageEditorCanvasRef {
  getMaskDataUrl: () => Promise<string | null>;
  clearMask: () => void;
  getCanvasDimensions: () => { width: number, height: number };
}

const EditorCanvas = React.forwardRef<ImageEditorCanvasRef, ImageEditorCanvasProps>(({ imageDataUrl, brushSize }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const drawImage = () => {
    if (!imageDataUrl || !imageCanvasRef.current || !drawingCanvasRef.current || !containerRef.current) return;
    const image = new Image();
    image.src = imageDataUrl;
    image.onload = () => {
      const containerWidth = containerRef.current!.offsetWidth;
      const containerHeight = containerRef.current!.offsetHeight;
      
      const imgAspectRatio = image.width / image.height;
      const containerAspectRatio = containerWidth / containerHeight;

      let width, height;

      if (imgAspectRatio > containerAspectRatio) {
        width = containerWidth;
        height = containerWidth / imgAspectRatio;
      } else {
        height = containerHeight;
        width = containerHeight * imgAspectRatio;
      }

      setImageDimensions({ width, height });

      const imageCtx = imageCanvasRef.current!.getContext('2d')!;
      const drawingCtx = drawingCanvasRef.current!.getContext('2d')!;

      imageCanvasRef.current!.width = width;
      imageCanvasRef.current!.height = height;
      drawingCanvasRef.current!.width = width;
      drawingCanvasRef.current!.height = height;

      imageCtx.drawImage(image, 0, 0, width, height);
      drawingCtx.clearRect(0, 0, width, height); // Clear previous mask
    };
  };

  useEffect(() => {
    drawImage();
    const debouncedResize = setTimeout(() => {
        window.addEventListener('resize', drawImage);
    }, 300);
    return () => {
        clearTimeout(debouncedResize);
        window.removeEventListener('resize', drawImage);
    }
  }, [imageDataUrl]);

  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawingCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getMousePos(e);
    const ctx = drawingCanvasRef.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getMousePos(e);
    const ctx = drawingCanvasRef.current!.getContext('2d')!;
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = drawingCanvasRef.current!.getContext('2d')!;
    ctx.closePath();
    setIsDrawing(false);
  };

  React.useImperativeHandle(ref, () => ({
    getCanvasDimensions: () => ({width: imageDimensions.width, height: imageDimensions.height}),
    clearMask: () => {
        const canvas = drawingCanvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    getMaskDataUrl: async () => {
        if (!imageCanvasRef.current || !drawingCanvasRef.current) return null;

        const drawingCanvas = drawingCanvasRef.current;
        const drawingCtx = drawingCanvas.getContext('2d')!;
        const drawingData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height).data;
        const isMaskEmpty = drawingData.every(channel => channel === 0);
        if (isMaskEmpty) return null;
        
        // Create a new canvas to generate the final mask
        const maskCanvas = document.createElement('canvas');
        
        // We need the original image dimensions for the mask
        const originalImage = new Image();
        originalImage.src = imageDataUrl;
        await new Promise(resolve => originalImage.onload = resolve);
        
        maskCanvas.width = originalImage.width;
        maskCanvas.height = originalImage.height;
        const maskCtx = maskCanvas.getContext('2d')!;
        
        // Scale factor between displayed canvas and original image
        const scale = originalImage.width / drawingCanvas.width;
        
        // Draw black background on the full-size mask canvas
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        // Scale and draw the mask strokes in solid white
        maskCtx.save();
        maskCtx.scale(scale, scale);
        maskCtx.drawImage(drawingCanvas, 0, 0);
        maskCtx.globalCompositeOperation = 'source-in';
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        maskCtx.restore();

        return maskCanvas.toDataURL('image/png');
    },
  }));

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative">
        <canvas ref={imageCanvasRef} style={{width: imageDimensions.width, height: imageDimensions.height}} className="absolute rounded-lg" />
        <canvas
            ref={drawingCanvasRef}
            style={{width: imageDimensions.width, height: imageDimensions.height}}
            className="absolute rounded-lg cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
        />
    </div>
  );
});

const ToolButton = ({ label, icon, isActive, onClick, disabled = false }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void, disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
      isActive
        ? 'bg-brand/20 text-brand'
        : 'text-text-secondary hover:bg-border'
    }`}
  >
    {icon}
  </button>
);

const AdjustmentSlider = ({ label, value, onChange }: { label: string, value: number, onChange: (value: number) => void}) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary flex justify-between">
            <span>{label}</span>
            <span>{value}</span>
        </label>
        <input
            type="range" min="0" max="200"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-brand"
        />
    </div>
);

interface AdvancedEditorProps {
    originalImage: File | null;
    history: string[];
    isLoading: boolean;
    onClose: () => void;
    onGenerate: (prompt: string, baseImagePart: GenerativePart, maskImagePart: GenerativePart | null) => void;
    onHistoryChange: (newHistory: string[]) => void;
}

const AdvancedEditor: React.FC<AdvancedEditorProps> = ({ originalImage, history, isLoading, onClose, onGenerate, onHistoryChange }) => {
    const [originalImageDataUrl, setOriginalImageDataUrl] = useState<string | null>(null);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [brushSize, setBrushSize] = useState(40);
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(true);
    // FIX: Included 'crop' in the type definition for activeTool to allow for future implementation and resolve the TypeScript error.
    const [activeTool, setActiveTool] = useState<'generate' | 'adjust' | 'crop'>('generate');
    const [adjustments, setAdjustments] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
    });

    const canvasRef = useRef<ImageEditorCanvasRef>(null);

    useEffect(() => {
        if (originalImage) {
            const reader = new FileReader();
            reader.onload = e => {
                const url = e.target?.result as string;
                setOriginalImageDataUrl(url);
                if (history.length === 0) {
                    setCurrentImage(url);
                    onHistoryChange([url]);
                } else {
                    setCurrentImage(history[history.length - 1]);
                }
            };
            reader.readAsDataURL(originalImage);
        }
    }, [originalImage]);
    
     useEffect(() => {
        if (history.length > 0) {
            setCurrentImage(history[history.length - 1]);
        }
    }, [history]);

    const handleSubmit = async () => {
        if (!prompt.trim() || !currentImage || isLoading) return;
        
        try {
            const maskDataUrl = await canvasRef.current?.getMaskDataUrl();
            let maskPart: GenerativePart | null = null;
            if (maskDataUrl) {
                const maskFile = await dataUrlToFile(maskDataUrl, 'mask.png');
                maskPart = await fileToGenerativePart(maskFile);
            }
            const currentImageFile = await dataUrlToFile(currentImage, 'current.png');
            const basePart = await fileToGenerativePart(currentImageFile);
            onGenerate(prompt, basePart, maskPart);
            canvasRef.current?.clearMask();
            setPrompt('');
        } catch(e) {
            console.error("Error preparing parts for generation:", e);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleClearMask = () => canvasRef.current?.clearMask();
    
    const handleRevertToOriginal = () => {
        if (originalImageDataUrl) {
            setCurrentImage(originalImageDataUrl);
        }
    }
    
    const handleApplyAdjustments = async () => {
        if (!currentImage) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise(resolve => {
            img.onload = resolve;
            img.src = currentImage;
        });

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
        ctx.drawImage(img, 0, 0);

        const newDataUrl = canvas.toDataURL('image/png');
        
        const newHistory = [...history, newDataUrl];
        onHistoryChange(newHistory);
        
        setAdjustments({ brightness: 100, contrast: 100, saturation: 100 });
        setActiveTool('generate');
    };
    
    const handleAiAction = async (actionPrompt: string) => {
        if (!currentImage || isLoading) return;
        try {
            const currentImageFile = await dataUrlToFile(currentImage, 'current.png');
            const basePart = await fileToGenerativePart(currentImageFile);
            onGenerate(actionPrompt, basePart, null);
        } catch(e) {
            console.error("Error preparing parts for AI action:", e);
        }
    };

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col animate-fade-in">
            {/* Header */}
            <header className="flex-shrink-0 bg-panel border-b border-border p-3 flex justify-between items-center">
                <h2 className="text-xl font-bold text-text-primary">Advanced Editor</h2>
                <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary rounded-full transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </header>

            {/* Main Content */}
            <div className="flex-grow flex overflow-hidden">
                {/* Tool Sidebar */}
                <nav className="w-16 bg-panel border-r border-border flex-shrink-0 flex flex-col items-center p-2">
                    <div className="space-y-2">
                        <ToolButton label="Generate" icon={<SparklesIcon className="w-6 h-6"/>} isActive={activeTool === 'generate'} onClick={() => setActiveTool('generate')} />
                        <ToolButton label="Adjust" icon={<AdjustmentsHorizontalIcon className="w-6 h-6"/>} isActive={activeTool === 'adjust'} onClick={() => setActiveTool('adjust')} />
                        <ToolButton label="Crop (Coming Soon)" icon={<CropIcon className="w-6 h-6"/>} isActive={activeTool === 'crop'} onClick={() => {}} disabled />
                    </div>
                    <div className="mt-auto space-y-2">
                        {originalImageDataUrl && <ToolButton label="Revert to Original" icon={<img src={originalImageDataUrl} alt="Original" className="w-8 h-8 rounded-sm object-cover" />} isActive={false} onClick={handleRevertToOriginal} />}
                        <ToolButton label="Fullscreen (Coming Soon)" icon={<ArrowsPointingOutIcon className="w-6 h-6"/>} isActive={false} onClick={() => {}} disabled />
                    </div>
                </nav>

                {/* Tool Options Panel */}
                <div className={`flex-shrink-0 bg-background border-r border-border transition-all duration-300 ease-in-out overflow-hidden ${activeTool === 'generate' || activeTool === 'adjust' ? 'w-64' : 'w-0'}`}>
                    {activeTool === 'generate' && (
                        <div className="p-4 space-y-4">
                            <h3 className="text-lg font-semibold text-text-primary">Generative Fill</h3>
                            <div className="space-y-2">
                                <label htmlFor="brush-size" className="text-sm font-medium text-text-secondary flex justify-between">
                                    <span>Brush Size</span>
                                    <span>{brushSize}px</span>
                                </label>
                                <input
                                    id="brush-size"
                                    type="range" min="5" max="100"
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(Number(e.target.value))}
                                    className="w-full accent-brand"
                                />
                            </div>
                            <button onClick={handleClearMask} className="w-full flex items-center justify-center gap-2 p-2 text-text-secondary rounded-lg hover:bg-border transition-colors">
                                <TrashIcon className="w-5 h-5"/>
                                <span>Clear Mask</span>
                            </button>
                             <p className="text-xs text-text-secondary">Paint over an area you want to change, then describe the change in the prompt bar below.</p>
                        </div>
                    )}
                     {activeTool === 'adjust' && (
                        <div className="p-4 space-y-4">
                            <h3 className="text-lg font-semibold text-text-primary">Adjustments</h3>
                            <AdjustmentSlider label="Brightness" value={adjustments.brightness} onChange={(v) => setAdjustments(p => ({...p, brightness: v}))} />
                            <AdjustmentSlider label="Contrast" value={adjustments.contrast} onChange={(v) => setAdjustments(p => ({...p, contrast: v}))} />
                            <AdjustmentSlider label="Saturation" value={adjustments.saturation} onChange={(v) => setAdjustments(p => ({...p, saturation: v}))} />
                            <button onClick={handleApplyAdjustments} className="w-full p-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover transition-colors">
                                Apply Adjustments
                            </button>
                             <p className="text-xs text-text-secondary">Changes are previewed live. Click 'Apply' to save them and create a new history state.</p>
                        </div>
                    )}
                </div>

                {/* Main Canvas Area */}
                <main className="flex-grow flex flex-col relative overflow-hidden">
                    <div className="flex-grow p-4 relative flex items-center justify-center">
                        <div style={{
                            filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                         }}>
                            {currentImage && <EditorCanvas ref={canvasRef} imageDataUrl={currentImage} brushSize={brushSize} />}
                        </div>
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
                                <div className="w-12 h-12 border-4 border-panel border-t-brand rounded-full animate-spin"></div>
                                <p className="text-text-secondary mt-4">Applying your edit...</p>
                            </div>
                        )}
                    </div>
                     {/* Prompt Bar */}
                    <div className="flex-shrink-0 p-4 pt-0">
                        <div className="flex items-center justify-center gap-2 mb-2">
                             <button onClick={() => handleAiAction("auto enhance photo, improve lighting, color, and contrast")} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 p-2 bg-panel-light text-text-primary rounded-lg hover:bg-border transition-colors disabled:opacity-50">
                                <WandIcon className="w-5 h-5"/>
                                <span className="text-sm font-semibold">Auto Enhance</span>
                            </button>
                             <button onClick={() => handleAiAction("intelligently sharpen this image, enhance fine details and textures without adding artifacts")} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 p-2 bg-panel-light text-text-primary rounded-lg hover:bg-border transition-colors disabled:opacity-50">
                                <TriangleIcon className="w-5 h-5"/>
                                <span className="text-sm font-semibold">AI Sharpen</span>
                            </button>
                        </div>
                        <div className="bg-panel border border-border rounded-xl shadow-2xl p-2 flex items-center gap-2">
                                <input 
                                type="text"
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe your edit (e.g., 'add a hat' or 'change background to a forest')"
                                className="w-full bg-transparent p-2 text-text-primary placeholder-text-secondary focus:outline-none"
                                disabled={isLoading}
                                />
                                <button onClick={handleSubmit} disabled={!prompt.trim() || isLoading} className="p-2 bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed">
                                    <SparklesIcon className="w-6 h-6" />
                                </button>
                        </div>
                    </div>
                </main>
                
                {/* History Panel */}
                <aside className={`flex-shrink-0 bg-panel border-l border-border transition-all duration-300 ease-in-out ${isHistoryPanelOpen ? 'w-48' : 'w-0'}`}>
                   <div className={`p-4 h-full flex flex-col ${isHistoryPanelOpen ? 'opacity-100' : 'opacity-0'}`}>
                     <h3 className="text-lg font-semibold text-text-primary mb-4">History</h3>
                     <div className="flex-grow space-y-3 overflow-y-auto pr-1">
                        {history.slice().reverse().map((url, index) => {
                             const isCurrent = url === currentImage;
                             const historyIndex = history.length - 1 - index;
                             return (
                                <button key={index} onClick={() => {
                                    setCurrentImage(url);
                                    setAdjustments({brightness: 100, contrast: 100, saturation: 100});
                                }} className={`relative group w-full aspect-square rounded-lg overflow-hidden border-2 ${isCurrent ? 'border-brand' : 'border-transparent hover:border-border'}`}>
                                    <img src={url} alt={`History ${historyIndex}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        Select
                                    </div>
                                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-black/50 text-white rounded-full">
                                        {historyIndex === 0 ? 'Original' : `v${historyIndex}`}
                                    </span>
                                </button>
                             )
                        })}
                     </div>
                   </div>
                </aside>
                 <button onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} className="absolute top-1/2 -translate-y-1/2 bg-panel border border-border p-1 rounded-l-full transition-all duration-300 ease-in-out" style={{ right: isHistoryPanelOpen ? '12rem' : '0' }}>
                    <ChevronLeftIcon className={`w-5 h-5 text-text-secondary transition-transform duration-300 ${isHistoryPanelOpen ? 'rotate-180' : ''}`} />
                 </button>
            </div>
        </div>
    );
};

export default AdvancedEditor;