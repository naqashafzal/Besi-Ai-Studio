import React, { useState, useMemo, useEffect } from 'react';
import { TrashIcon, XMarkIcon, PencilIcon, UserIcon, ClipboardIcon, KeyIcon } from './Icons';
import { PromptCategory, Prompt, UserProfile, Plan, PaymentSettings, PlanCountryPrice, GenerativePart, AppSettings, Coupon } from '../types';
import { countryList } from '../constants';
import ImageUploader from './ImageUploader';
import { generatePromptFromImage } from '../services/geminiService';
import { fileToGenerativePart } from '../utils/fileHelpers';

type AdminTab = 'users' | 'prompts' | 'settings' | 'payments' | 'coupons';

interface AdminPanelProps {
  allUsers: UserProfile[];
  plans: Plan[];
  prompts: PromptCategory[];
  paymentSettings: PaymentSettings | null;
  planCountryPrices: PlanCountryPrice[];
  appSettings: AppSettings | null;
  coupons: Coupon[];
  onAddPrompt: (prompt: { text: string; imageFile: File | null }, categoryTitle: string) => void;
  onRemovePrompt: (promptId: string) => void;
  onUpdatePrompt: (promptId: string, updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean }, originalImageUrl: string | null) => void;
  onUpdateUser: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onUpdatePlan: (planId: number, updates: Partial<Plan>) => Promise<void>;
  onUpdatePaymentSettings: (updates: Partial<PaymentSettings>) => Promise<void>;
  onAddPlanCountryPrice: (price: Omit<PlanCountryPrice, 'id'>) => Promise<void>;
  onUpdatePlanCountryPrice: (priceId: number, updates: Partial<PlanCountryPrice>) => Promise<void>;
  onDeletePlanCountryPrice: (priceId: number) => Promise<void>;
  onUpdateAppSettings: (updates: Partial<Omit<AppSettings, 'id'>>) => Promise<void>;
  onAddCoupon: (couponData: Omit<Coupon, 'id' | 'times_used' | 'created_at'>) => Promise<void>;
  onUpdateCoupon: (couponId: number, updates: Partial<Coupon>) => Promise<void>;
  onDeleteCoupon: (couponId: number) => Promise<void>;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    allUsers,
    plans,
    prompts, 
    paymentSettings,
    planCountryPrices,
    appSettings,
    coupons,
    onAddPrompt, 
    onRemovePrompt, 
    onUpdatePrompt,
    onUpdateUser,
    onDeleteUser,
    onUpdatePlan,
    onUpdatePaymentSettings,
    onAddPlanCountryPrice,
    onUpdatePlanCountryPrice,
    onDeletePlanCountryPrice,
    onUpdateAppSettings,
    onAddCoupon,
    onUpdateCoupon,
    onDeleteCoupon,
    onClose 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  return (
    <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-panel rounded-2xl shadow-2xl border border-border w-full max-w-6xl h-[90vh] flex flex-col">
        <header className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Admin Dashboard</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close admin panel"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
        </header>

        <div className="flex flex-shrink-0 border-b border-border overflow-x-auto">
            <TabButton name="Users" tab="users" activeTab={activeTab} onClick={setActiveTab} />
            <TabButton name="Prompts" tab="prompts" activeTab={activeTab} onClick={setActiveTab} />
            <TabButton name="Settings" tab="settings" activeTab={activeTab} onClick={setActiveTab} />
            <TabButton name="Payments" tab="payments" activeTab={activeTab} onClick={setActiveTab} />
            <TabButton name="Coupons" tab="coupons" activeTab={activeTab} onClick={setActiveTab} />
        </div>

        <div className="flex-grow overflow-y-auto p-4 sm:p-6">
          {activeTab === 'users' && <UserManagementTab users={allUsers} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} />}
          {activeTab === 'prompts' && <PromptManagementTab prompts={prompts} onAddPrompt={onAddPrompt} onRemovePrompt={onRemovePrompt} onUpdatePrompt={onUpdatePrompt} />}
          {activeTab === 'settings' && <SettingsTab 
                                            plans={plans} 
                                            onUpdatePlan={onUpdatePlan}
                                            planCountryPrices={planCountryPrices}
                                            onAddPlanCountryPrice={onAddPlanCountryPrice}
                                            onUpdatePlanCountryPrice={onUpdatePlanCountryPrice}
                                            onDeletePlanCountryPrice={onDeletePlanCountryPrice}
                                            appSettings={appSettings}
                                            onUpdateAppSettings={onUpdateAppSettings}
                                        />}
          {activeTab === 'payments' && <PaymentSettingsTab settings={paymentSettings} onUpdateSettings={onUpdatePaymentSettings} />}
          {activeTab === 'coupons' && <CouponManagementTab coupons={coupons} plans={plans} onAdd={onAddCoupon} onUpdate={onUpdateCoupon} onDelete={onDeleteCoupon} />}
        </div>
      </div>
    </div>
  );
};

// --- Tab Button Component ---
interface TabButtonProps {
    name: string;
    tab: AdminTab;
    activeTab: AdminTab;
    onClick: (tab: AdminTab) => void;
}
const TabButton: React.FC<TabButtonProps> = ({ name, tab, activeTab, onClick }) => (
    <button
        onClick={() => onClick(tab)}
        className={`px-4 sm:px-6 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 whitespace-nowrap ${
            activeTab === tab 
            ? 'border-brand text-brand'
            : 'border-transparent text-text-secondary hover:text-text-primary'
        }`}
    >
        {name}
    </button>
);


// --- User Management Tab ---
interface UserManagementTabProps {
    users: UserProfile[];
    onUpdateUser: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
}
const UserManagementTab: React.FC<UserManagementTabProps> = ({ users, onUpdateUser, onDeleteUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    const filteredUsers = useMemo(() => 
        users.filter(user => 
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => (a.email ?? '').localeCompare(b.email ?? '')), 
    [users, searchTerm]);
    
    const handleSaveUser = async (updates: Partial<UserProfile>) => {
        if (!editingUser) return;
        try {
            await onUpdateUser(editingUser.id, updates);
            setEditingUser(null);
        } catch (error) {
            alert("Failed to update user. See console for details.");
            console.error(error);
        }
    };
    
    const handleDeleteUser = async (user: UserProfile) => {
        if(window.confirm(`Are you sure you want to delete user ${user.email}? This action is irreversible.`)) {
             try {
                await onDeleteUser(user.id);
            } catch (error) {
                alert("Failed to delete user. See console for details.");
                console.error(error);
            }
        }
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full max-w-md p-2 mb-6 bg-background border border-border rounded-lg"
            />
            <div className="border border-border rounded-lg overflow-hidden">
                <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 p-3 bg-panel-light text-xs text-text-secondary uppercase tracking-wider font-bold">
                    <div>Email</div>
                    <div>Phone</div>
                    <div>Country</div>
                    <div>Plan</div>
                    <div>Credits</div>
                    <div>Role</div>
                    <div className="text-right">Actions</div>
                </div>
                <div>
                    {filteredUsers.map(user => (
                        editingUser?.id === user.id 
                        ? <EditUserRow key={user.id} user={editingUser} onSave={handleSaveUser} onCancel={() => setEditingUser(null)} />
                        : <UserRow key={user.id} user={user} onEdit={setEditingUser} onDelete={handleDeleteUser} />
                    ))}
                </div>
            </div>
        </div>
    );
};

interface UserRowProps {
    user: UserProfile;
    onEdit: (user: UserProfile) => void;
    onDelete: (user: UserProfile) => void | Promise<void>;
}
const UserRow: React.FC<UserRowProps> = ({ user, onEdit, onDelete }) => (
    <div className="p-4 border-b border-border last:border-b-0 hover:bg-panel-light/50 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] md:gap-4 md:items-center text-sm">
        {/* Mobile Card View */}
        <div className="md:hidden space-y-2">
            <div className="flex justify-between items-start">
                <span className="font-bold text-text-primary break-all">{user.email}</span>
                <div className="space-x-1 flex-shrink-0 ml-4">
                    <button onClick={() => onEdit(user)} className="p-2 text-text-secondary hover:text-brand" aria-label={`Edit user ${user.email}`}><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(user)} className="p-2 text-text-secondary hover:text-red-500" aria-label={`Delete user ${user.email}`}><TrashIcon className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-secondary">
                <div><strong className="text-text-primary">Plan:</strong> <span className="capitalize">{user.plan}</span></div>
                <div><strong className="text-text-primary">Credits:</strong> {user.credits}</div>
                <div><strong className="text-text-primary">Role:</strong> <span className="capitalize">{user.role}</span></div>
                <div><strong className="text-text-primary">Phone:</strong> {user.phone || 'N/A'}</div>
                <div className="col-span-2"><strong className="text-text-primary">Country:</strong> {user.country || 'N/A'}</div>
            </div>
        </div>
        
        {/* Desktop Row View */}
        <div className="hidden md:block text-text-primary font-medium break-all">{user.email}</div>
        <div className="hidden md:block text-text-secondary">{user.phone ?? 'N/A'}</div>
        <div className="hidden md:block text-text-secondary">{user.country ?? 'N/A'}</div>
        <div className="hidden md:block capitalize">{user.plan}</div>
        <div className="hidden md:block">{user.credits}</div>
        <div className="hidden md:block capitalize">{user.role}</div>
        <div className="hidden md:flex justify-end space-x-2">
            <button onClick={() => onEdit(user)} className="p-2 text-text-secondary hover:text-brand" aria-label={`Edit user ${user.email}`}><PencilIcon className="w-4 h-4" /></button>
            <button onClick={() => onDelete(user)} className="p-2 text-text-secondary hover:text-red-500" aria-label={`Delete user ${user.email}`}><TrashIcon className="w-4 h-4" /></button>
        </div>
    </div>
);


interface EditUserRowProps {
    user: UserProfile;
    onSave: (updates: Partial<UserProfile>) => void | Promise<void>;
    onCancel: () => void;
}
const EditUserRow: React.FC<EditUserRowProps> = ({ user, onSave, onCancel }) => {
    const [credits, setCredits] = useState(user.credits);
    const [plan, setPlan] = useState(user.plan);
    const [role, setRole] = useState(user.role);
    const [phone, setPhone] = useState(user.phone ?? '');
    const [country, setCountry] = useState(user.country ?? '');

    const handleSave = () => {
        onSave({ credits: Number(credits), plan, role, phone, country });
    };

    return (
        <div className="p-4 bg-brand/10 border-b border-border last:border-b-0 space-y-4">
             <p className="font-bold text-text-primary md:hidden">{user.email}</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="bg-background border border-border rounded-md p-2 w-full" />
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" className="bg-background border border-border rounded-md p-2 w-full" />
                <select value={plan} onChange={e => setPlan(e.target.value as 'free' | 'pro')} className="bg-background border border-border rounded-md p-2 w-full">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                </select>
                <input type="number" value={credits} onChange={e => setCredits(parseInt(e.target.value, 10))} className="bg-background border border-border rounded-md p-2 w-full" />
                 <select value={role} onChange={e => setRole(e.target.value as 'user' | 'admin')} className="bg-background border border-border rounded-md p-2 w-full">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>
             </div>
            <div className="flex justify-end items-center space-x-2">
                <button onClick={handleSave} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">Save</button>
                <button onClick={onCancel} className="px-3 py-1 text-sm bg-panel-light text-text-primary rounded hover:bg-border">Cancel</button>
            </div>
        </div>
    );
};


// --- Prompt Management Tab ---
const PromptManagementTab: React.FC<{
  prompts: PromptCategory[];
  onAddPrompt: (prompt: { text: string; imageFile: File | null }, categoryTitle: string) => void;
  onRemovePrompt: (promptId: string) => void;
  onUpdatePrompt: (promptId: string, updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean }, originalImageUrl: string | null) => void;
}> = ({ prompts, onAddPrompt, onRemovePrompt, onUpdatePrompt }) => {
  const [newPromptText, setNewPromptText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPromptImageFile, setNewPromptImageFile] = useState<File | null>(null);
  const [newPromptImageDataUrl, setNewPromptImageDataUrl] = useState<string | null>(null);

  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);

  const handleImageChange = (file: File | null) => {
    if (file) {
      setNewPromptImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setNewPromptImageDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setNewPromptImageFile(null);
      setNewPromptImageDataUrl(null);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!newPromptImageFile) {
        setGenerationError("Please upload an image first.");
        return;
    }
    setIsGeneratingPrompt(true);
    setGenerationError(null);
    try {
        const imagePart = await fileToGenerativePart(newPromptImageFile);
        const generatedPrompt = await generatePromptFromImage(
            imagePart, 
            { realism: true, style: true, background: true, clothing: false, lighting: false }, 
            ''
        );
        setNewPromptText(generatedPrompt);
    } catch (err) {
        setGenerationError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
        setIsGeneratingPrompt(false);
    }
  };

  const handleAddPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPromptText.trim() && newCategory.trim()) {
      onAddPrompt({ text: newPromptText, imageFile: newPromptImageFile }, newCategory);
      setNewPromptText('');
      setNewCategory('');
      setNewPromptImageFile(null);
      setNewPromptImageDataUrl(null);
    } else {
      alert('Please fill in prompt text and category.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        <div className="bg-background p-6 rounded-lg border border-border">
          <h3 className="text-xl font-semibold mb-4 text-text-primary">Add New Example Prompt</h3>
          <form onSubmit={handleAddPrompt} className="space-y-4">
            <textarea
              value={newPromptText}
              onChange={(e) => setNewPromptText(e.target.value)}
              placeholder="Prompt Text"
              className="w-full h-28 p-2 bg-panel-light border border-border rounded-lg"
              required
            />
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category"
              className="w-full p-2 bg-panel-light border border-border rounded-lg"
              list="category-suggestions"
              required
            />
            <datalist id="category-suggestions">
                {prompts.map(cat => <option key={cat.id} value={cat.title} />)}
            </datalist>
             <ImageUploader 
              onImageChange={handleImageChange}
              imageDataUrl={newPromptImageDataUrl}
              disabled={false}
            />
            <button
                type="button"
                onClick={handleGeneratePrompt}
                disabled={isGeneratingPrompt || !newPromptImageFile}
                className="w-full py-2 px-4 bg-panel-light text-text-primary font-semibold rounded-lg hover:bg-border disabled:opacity-50"
            >
                {isGeneratingPrompt ? 'Generating...' : 'Generate Prompt from Image'}
            </button>
            {generationError && <p className="text-red-400 text-sm mt-1">{generationError}</p>}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover"
            >
              Add Prompt
            </button>
          </form>
        </div>
      </div>
      <div className="space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
        {prompts.map(category => (
          <div key={category.id}>
            <h4 className="text-lg font-bold text-brand mb-3">{category.title}</h4>
            <ul className="space-y-2 pr-2">
              {category.prompts.map((prompt) => {
                 const isEditing = editingPrompt === prompt.id;
                 
                return isEditing ? (
                  <EditPromptForm
                    key={`${prompt.id}-edit`}
                    prompt={prompt}
                    categoryTitle={category.title}
                    allCategories={prompts.map(c => c.title)}
                    onSave={(updates) => {
                        onUpdatePrompt(prompt.id, updates, prompt.imageUrl);
                        setEditingPrompt(null);
                    }}
                    onCancel={() => setEditingPrompt(null)}
                  />
                ) : (
                <li key={prompt.id} className="flex items-center justify-between p-2 bg-panel-light/50 rounded-md gap-2">
                  {prompt.imageUrl && <img src={prompt.imageUrl} alt="" className="w-10 h-10 object-cover rounded-md flex-shrink-0" />}
                  <p className="text-sm text-text-secondary flex-1 min-w-0" title={prompt.text}>{prompt.text}</p>
                  <div className="flex-shrink-0 flex items-center">
                    <button onClick={() => setEditingPrompt(prompt.id)} className="p-1 text-text-secondary hover:text-brand">
                        <PencilIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => onRemovePrompt(prompt.id)} className="p-1 text-red-400 hover:text-red-300">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

interface EditPromptFormProps {
  prompt: Prompt;
  categoryTitle: string;
  allCategories: string[];
  onSave: (updates: { text: string; categoryTitle: string; imageFile: File | null; removeImage: boolean }) => void;
  onCancel: () => void;
}

const EditPromptForm: React.FC<EditPromptFormProps> = ({ prompt, categoryTitle, allCategories, onSave, onCancel }) => {
  const [text, setText] = useState(prompt.text);
  const [category, setCategory] = useState(categoryTitle);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(prompt.imageUrl);
  const [removeImage, setRemoveImage] = useState(false);

  const handleImageChange = (file: File | null) => {
    if (file) {
      setImageFile(file);
      setRemoveImage(false);
      const reader = new FileReader();
      reader.onload = e => setImageDataUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else { // Image removed via uploader
      setImageFile(null);
      setImageDataUrl(null);
      setRemoveImage(true);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && category.trim()) {
      onSave({ text, categoryTitle: category, imageFile, removeImage });
    } else {
      alert("Text and category cannot be empty.");
    }
  };

  return (
    <li className="bg-brand/10 p-4 rounded-lg border border-brand space-y-4">
      <form onSubmit={handleSave} className="space-y-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full h-24 p-2 bg-background border border-border rounded-lg"
        />
        <input
          type="text"
          value={category}
          onChange={e => setCategory(e.target.value)}
          list="edit-category-suggestions"
          className="w-full p-2 bg-background border border-border rounded-lg"
          placeholder="Category"
        />
        <datalist id="edit-category-suggestions">
          {allCategories.map(cat => <option key={cat} value={cat} />)}
        </datalist>
        <ImageUploader onImageChange={handleImageChange} imageDataUrl={imageDataUrl} disabled={false} />
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onCancel} className="px-3 py-1 text-sm bg-panel-light text-text-primary rounded hover:bg-border">Cancel</button>
          <button type="submit" className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">Save</button>
        </div>
      </form>
    </li>
  );
};


// --- Settings Tab ---
interface SettingsTabProps {
    plans: Plan[];
    onUpdatePlan: (planId: number, updates: Partial<Plan>) => Promise<void>;
    planCountryPrices: PlanCountryPrice[];
    onAddPlanCountryPrice: (price: Omit<PlanCountryPrice, 'id'>) => Promise<void>;
    onUpdatePlanCountryPrice: (priceId: number, updates: Partial<PlanCountryPrice>) => Promise<void>;
    onDeletePlanCountryPrice: (priceId: number) => Promise<void>;
    appSettings: AppSettings | null;
    onUpdateAppSettings: (updates: Partial<Omit<AppSettings, 'id'>>) => Promise<void>;
}
const SettingsTab: React.FC<SettingsTabProps> = ({ 
    plans, 
    onUpdatePlan,
    planCountryPrices,
    onAddPlanCountryPrice,
    onUpdatePlanCountryPrice,
    onDeletePlanCountryPrice,
    appSettings,
    onUpdateAppSettings
}) => {
    const [editablePlans, setEditablePlans] = useState<Plan[]>(plans);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setEditablePlans(plans);
    }, [plans]);

    const handlePlanChange = (planId: number, field: keyof Plan, value: string | number) => {
        setEditablePlans(currentPlans => 
            currentPlans.map(p => p.id === planId ? { ...p, [field]: value } : p)
        );
    };
    
    const handleSave = async (plan: Plan) => {
        setIsSaving(true);
        try {
            await onUpdatePlan(plan.id, {
                price: plan.price,
                credits_per_month: plan.credits_per_month,
            });
            alert(`${plan.name} plan updated successfully!`);
        } catch (error) {
            alert("Failed to update plan. See console for details.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-text-primary mb-6">Membership Plan Settings</h3>
            <div className="space-y-6">
                {editablePlans.filter(p => p.name !== 'free').map(plan => (
                    <div key={plan.id} className="bg-background p-6 rounded-lg border border-border">
                        <h4 className="text-xl font-semibold capitalize mb-4 text-brand">{plan.name} Plan</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Default Price (USD)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={plan.price}
                                    onChange={e => handlePlanChange(plan.id, 'price', parseFloat(e.target.value))}
                                    className="w-full p-2 bg-panel-light border border-border rounded-lg"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Credits per Month</label>
                                <input 
                                    type="number"
                                    value={plan.credits_per_month}
                                    onChange={e => handlePlanChange(plan.id, 'credits_per_month', parseInt(e.target.value))}
                                    className="w-full p-2 bg-panel-light border border-border rounded-lg"
                                />
                             </div>
                        </div>
                        <div className="mt-6 text-right">
                             <button
                                onClick={() => handleSave(plan)}
                                disabled={isSaving}
                                className="px-5 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover disabled:opacity-50"
                             >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                             </button>
                        </div>
                    </div>
                ))}
            </div>

             <div className="mt-12">
                <h3 className="text-2xl font-bold text-text-primary mb-6">Credit Cost Settings</h3>
                <CreditSettings settings={appSettings} onSave={onUpdateAppSettings} />
            </div>
            
            <div className="mt-12">
                <h3 className="text-2xl font-bold text-text-primary mb-6">Regional Pricing</h3>
                 <RegionalPricingManager
                    plans={plans}
                    countryPrices={planCountryPrices}
                    onAdd={onAddPlanCountryPrice}
                    onUpdate={onUpdatePlanCountryPrice}
                    onDelete={onDeletePlanCountryPrice}
                />
            </div>
        </div>
    );
};

// --- Regional Pricing Manager ---
interface RegionalPricingManagerProps {
  plans: Plan[];
  countryPrices: PlanCountryPrice[];
  onAdd: (price: Omit<PlanCountryPrice, 'id'>) => Promise<void>;
  onUpdate: (id: number, updates: Partial<PlanCountryPrice>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}
const RegionalPricingManager: React.FC<RegionalPricingManagerProps> = ({ plans, countryPrices, onAdd, onUpdate, onDelete }) => {
    const proPlan = plans.find(p => p.name === 'pro');
    const [planId, setPlanId] = useState<number | ''>(proPlan?.id || '');
    const [country, setCountry] = useState('');
    const [price, setPrice] = useState('');
    const [currency, setCurrency] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editState, setEditState] = useState<Partial<PlanCountryPrice>>({});
    
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!planId || !country || !price || !currency) {
            alert("Please fill all fields.");
            return;
        }
        try {
            await onAdd({ plan_id: Number(planId), country, price: Number(price), currency });
            setCountry(''); setPrice(''); setCurrency('');
        } catch (error) {
            alert("Failed to add price. See console for details.");
        }
    };
    
    const handleEdit = (p: PlanCountryPrice) => {
        setEditingId(p.id);
        setEditState({ country: p.country, price: p.price, currency: p.currency });
    };

    const handleSave = async (id: number) => {
        try {
            await onUpdate(id, editState);
            setEditingId(null);
            setEditState({});
        } catch (error) {
            alert("Failed to save price. See console for details.");
        }
    };

    const handleDelete = async (id: number) => {
        if(window.confirm("Are you sure you want to delete this regional price?")) {
            try {
                await onDelete(id);
            } catch(e) {
                alert("Failed to delete price. See console for details.");
            }
        }
    };

    const getPlanName = (planId: number) => plans.find(p => p.id === planId)?.name || 'Unknown';

    return (
        <div className="space-y-6">
            <form onSubmit={handleAdd} className="bg-background p-4 rounded-lg border border-border grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Plan</label>
                    <select value={planId} onChange={e => setPlanId(Number(e.target.value))} className="w-full p-2 bg-panel-light border border-border rounded-lg">
                        {plans.filter(p => p.name !== 'free').map(p => <option key={p.id} value={p.id} className="capitalize">{p.name}</option>)}
                    </select>
                </div>
                 <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Country</label>
                    <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-2 bg-panel-light border border-border rounded-lg">
                        <option value="">Select Country</option>
                        {countryList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                 <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Price</label>
                    <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g., 2800" className="w-full p-2 bg-panel-light border border-border rounded-lg"/>
                </div>
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Currency</label>
                    <input type="text" value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} placeholder="e.g., PKR" className="w-full p-2 bg-panel-light border border-border rounded-lg"/>
                </div>
                 <div className="md:col-span-1">
                     <button type="submit" className="w-full p-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover">Add Price</button>
                 </div>
            </form>
            
            <div className="border border-border rounded-lg overflow-hidden">
                <div className="hidden md:grid md:grid-cols-5 gap-4 p-3 bg-panel-light text-xs text-text-secondary uppercase tracking-wider font-bold">
                    <div>Plan</div>
                    <div>Country</div>
                    <div>Price</div>
                    <div>Currency</div>
                    <div className="text-right">Actions</div>
                </div>
                <div>
                {countryPrices.map(p => (
                    <div key={p.id} className="p-4 border-b border-border last:border-b-0 hover:bg-panel-light/50">
                        {editingId === p.id ? (
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                                <span className="capitalize font-bold md:font-normal">{getPlanName(p.plan_id)}</span>
                                <select value={editState.country} onChange={e => setEditState({...editState, country: e.target.value})} className="w-full p-1 bg-background border border-border rounded">
                                     {countryList.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input type="number" value={editState.price} onChange={e => setEditState({...editState, price: Number(e.target.value)})} className="w-full p-1 bg-background border border-border rounded"/>
                                <input type="text" value={editState.currency} onChange={e => setEditState({...editState, currency: e.target.value.toUpperCase()})} className="w-full p-1 bg-background border border-border rounded"/>
                                <div className="flex justify-end space-x-2">
                                    <button onClick={() => handleSave(p.id)} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Save</button>
                                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs bg-panel-light text-text-primary rounded hover:bg-border">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-sm">
                               <div className="capitalize"><span className="md:hidden font-bold text-text-primary mr-2">Plan:</span> {getPlanName(p.plan_id)}</div>
                               <div><span className="md:hidden font-bold text-text-primary mr-2">Country:</span> {p.country}</div>
                               <div><span className="md:hidden font-bold text-text-primary mr-2">Price:</span> {p.price}</div>
                               <div><span className="md:hidden font-bold text-text-primary mr-2">Currency:</span> {p.currency}</div>
                               <div className="flex justify-end space-x-2">
                                   <button onClick={() => handleEdit(p)} className="p-2 text-text-secondary hover:text-brand"><PencilIcon className="w-4 h-4" /></button>
                                   <button onClick={() => handleDelete(p.id)} className="p-2 text-text-secondary hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                               </div>
                            </div>
                        )}
                    </div>
                ))}
                </div>
            </div>
        </div>
    );
};

// --- Credit Settings Component ---
interface CreditSettingsProps {
    settings: AppSettings | null;
    onSave: (updates: Partial<Omit<AppSettings, 'id'>>) => Promise<void>;
}

const CreditSettings: React.FC<CreditSettingsProps> = ({ settings, onSave }) => {
    const [costs, setCosts] = useState({
        image_credit_cost: 3,
        video_credit_cost: 50,
        prompt_credit_cost: 1,
        chat_credit_cost: 1,
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setCosts({
                image_credit_cost: settings.image_credit_cost,
                video_credit_cost: settings.video_credit_cost,
                prompt_credit_cost: settings.prompt_credit_cost,
                chat_credit_cost: settings.chat_credit_cost,
            });
        }
    }, [settings]);

    const handleChange = (field: keyof typeof costs, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0) {
            setCosts(prev => ({ ...prev, [field]: numValue }));
        }
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(costs);
            alert("Credit costs updated successfully!");
        } catch (error) {
            alert("Failed to update credit costs.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-background p-6 rounded-lg border border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Image Generation</label>
                    <input type="number" value={costs.image_credit_cost} onChange={e => handleChange('image_credit_cost', e.target.value)} className="w-full p-2 bg-panel-light border border-border rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Video Generation</label>
                    <input type="number" value={costs.video_credit_cost} onChange={e => handleChange('video_credit_cost', e.target.value)} className="w-full p-2 bg-panel-light border border-border rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Prompt from Image</label>
                    <input type="number" value={costs.prompt_credit_cost} onChange={e => handleChange('prompt_credit_cost', e.target.value)} className="w-full p-2 bg-panel-light border border-border rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">AI Chat Message</label>
                    <input type="number" value={costs.chat_credit_cost} onChange={e => handleChange('chat_credit_cost', e.target.value)} className="w-full p-2 bg-panel-light border border-border rounded-lg" />
                </div>
            </div>
             <div className="mt-4 text-right">
                <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Credit Costs'}
                </button>
            </div>
        </div>
    );
};


// --- Payment Settings Tab ---
interface PaymentSettingsTabProps {
    settings: PaymentSettings | null;
    onUpdateSettings: (updates: Partial<PaymentSettings>) => Promise<void>;
}

const PaymentSettingsTab: React.FC<PaymentSettingsTabProps> = ({ settings, onUpdateSettings }) => {
    const [stripePublicKey, setStripePublicKey] = useState('');
    const [stripeSecretKey, setStripeSecretKey] = useState('');
    const [paypalClientId, setPaypalClientId] = useState('');
    const [manualInstructions, setManualInstructions] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (settings) {
            setStripePublicKey(settings.stripe_public_key || '');
            setStripeSecretKey(settings.stripe_secret_key || '');
            setPaypalClientId(settings.paypal_client_id || '');
            setManualInstructions(settings.manual_payment_instructions_pk || '');
        }
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdateSettings({
                stripe_public_key: stripePublicKey,
                stripe_secret_key: stripeSecretKey,
                paypal_client_id: paypalClientId,
                manual_payment_instructions_pk: manualInstructions,
            });
            alert("Payment settings updated successfully!");
        } catch (error) {
            alert("Failed to update payment settings. See console for details.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                 <KeyIcon className="w-8 h-8 text-brand" />
                 <h3 className="text-2xl font-bold text-text-primary">Payment Integration</h3>
            </div>
            
            <div className="space-y-8">
                {/* PayPal Settings */}
                <div className="bg-background p-6 rounded-lg border border-border">
                    <h4 className="text-xl font-semibold text-text-primary mb-1">PayPal Configuration</h4>
                    <p className="text-sm text-text-secondary mb-4">
                        Enable payments for international users. Find keys on the <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="text-brand underline">PayPal Developer Dashboard</a>.
                    </p>
                    <label htmlFor="paypal-client-id" className="block text-sm font-medium text-text-secondary mb-1">Client ID</label>
                    <input
                        id="paypal-client-id"
                        type="text"
                        value={paypalClientId}
                        onChange={e => setPaypalClientId(e.target.value)}
                        placeholder="AbC123..."
                        className="w-full p-2 bg-panel-light border border-border rounded-lg"
                    />
                </div>

                {/* Manual Payment for Pakistan */}
                <div className="bg-background p-6 rounded-lg border border-border">
                    <h4 className="text-xl font-semibold text-text-primary mb-1">Manual Payments (Pakistan)</h4>
                     <p className="text-sm text-text-secondary mb-4">
                        Provide instructions for users in Pakistan to pay manually (e.g., bank transfer, local payment apps).
                    </p>
                    <label htmlFor="manual-instructions-pk" className="block text-sm font-medium text-text-secondary mb-1">Payment Instructions</label>
                    <textarea
                        id="manual-instructions-pk"
                        value={manualInstructions}
                        onChange={e => setManualInstructions(e.target.value)}
                        placeholder="e.g., Please transfer to Bank Account: ... and send screenshot to ..."
                        className="w-full p-2 h-32 bg-panel-light border border-border rounded-lg resize-y"
                    />
                </div>
                
                 {/* Stripe Settings */}
                 <div className="bg-background p-6 rounded-lg border border-border">
                    <h4 className="text-xl font-semibold text-text-primary mb-1">Stripe Configuration</h4>
                    <p className="text-sm text-text-secondary mb-4">
                        Enter your Stripe API keys. You can find your keys on the <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-brand underline">Stripe Dashboard</a>.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="stripe-public-key" className="block text-sm font-medium text-text-secondary mb-1">Public Key</label>
                            <input
                                id="stripe-public-key"
                                type="text"
                                value={stripePublicKey}
                                onChange={e => setStripePublicKey(e.target.value)}
                                placeholder="pk_test_..."
                                className="w-full p-2 bg-panel-light border border-border rounded-lg"
                            />
                        </div>
                        <div>
                            <label htmlFor="stripe-secret-key" className="block text-sm font-medium text-text-secondary mb-1">Secret Key</label>
                            <input
                                id="stripe-secret-key"
                                type="password"
                                value={stripeSecretKey}
                                onChange={e => setStripeSecretKey(e.target.value)}
                                placeholder="sk_test_..."
                                className="w-full p-2 bg-panel-light border border-border rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-right">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-hover disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save All Payment Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Coupon Management Tab ---
interface CouponManagementTabProps {
    coupons: Coupon[];
    plans: Plan[];
    onAdd: (couponData: Omit<Coupon, 'id' | 'times_used' | 'created_at'>) => Promise<void>;
    onUpdate: (couponId: number, updates: Partial<Coupon>) => Promise<void>;
    onDelete: (couponId: number) => Promise<void>;
}
const CouponManagementTab: React.FC<CouponManagementTabProps> = ({ coupons, plans, onAdd, onUpdate, onDelete }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    const handleEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setShowForm(true);
    };

    const handleCancel = () => {
        setEditingCoupon(null);
        setShowForm(false);
    };

    const handleSave = async (couponData: Omit<Coupon, 'id' | 'times_used' | 'created_at' | 'is_active'> & { is_active: boolean }) => {
        try {
            if (editingCoupon) {
                await onUpdate(editingCoupon.id, couponData);
            } else {
                await onAdd(couponData);
            }
            handleCancel();
        } catch (error) {
            alert(`Failed to save coupon. ${error instanceof Error ? error.message : ''}`);
            console.error(error);
        }
    };

    const handleDelete = async (couponId: number) => {
        if (window.confirm("Are you sure you want to delete this coupon? This action cannot be undone.")) {
            try {
                await onDelete(couponId);
            } catch (error) {
                alert("Failed to delete coupon.");
            }
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-text-primary">Manage Coupons</h3>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover">
                        Add New Coupon
                    </button>
                )}
            </div>
            
            {showForm && <CouponForm plans={plans} coupon={editingCoupon} onSave={handleSave} onCancel={handleCancel} />}

            <div className="border border-border rounded-lg overflow-hidden">
                <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 p-3 bg-panel-light text-xs text-text-secondary uppercase tracking-wider font-bold">
                    <div>Code</div>
                    <div>Discount</div>
                    <div>Plan</div>
                    <div>Usage</div>
                    <div>Expires</div>
                    <div>Status</div>
                    <div className="text-right">Actions</div>
                </div>
                <div>
                    {coupons.map(coupon => (
                        <CouponRow key={coupon.id} coupon={coupon} plans={plans} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const CouponRow: React.FC<{ coupon: Coupon; plans: Plan[]; onEdit: (c: Coupon) => void; onDelete: (id: number) => void; }> = ({ coupon, plans, onEdit, onDelete }) => {
    const planName = coupon.applicable_plan_id ? plans.find(p => p.id === coupon.applicable_plan_id)?.name : 'All Plans';
    const expires = coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'Never';
    const discount = coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`;
    const usage = coupon.usage_limit ? `${coupon.times_used} / ${coupon.usage_limit}` : `${coupon.times_used}`;
    
    return (
         <div className="p-4 border-b border-border last:border-b-0 hover:bg-panel-light/50 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] md:gap-4 md:items-center text-sm">
            {/* Mobile View */}
            <div className="md:hidden space-y-2">
                 <div className="flex justify-between items-start">
                    <div>
                        <span className="font-bold text-text-primary break-all">{coupon.code}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${coupon.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                            {coupon.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div className="space-x-1 flex-shrink-0 ml-4">
                        <button onClick={() => onEdit(coupon)} className="p-2 text-text-secondary hover:text-brand"><PencilIcon className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(coupon.id)} className="p-2 text-text-secondary hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-secondary">
                    <div><strong className="text-text-primary">Discount:</strong> {discount}</div>
                    <div><strong className="text-text-primary">Usage:</strong> {usage}</div>
                    <div className="capitalize"><strong className="text-text-primary">Plan:</strong> {planName}</div>
                    <div><strong className="text-text-primary">Expires:</strong> {expires}</div>
                </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block font-mono text-brand font-semibold">{coupon.code}</div>
            <div className="hidden md:block">{discount}</div>
            <div className="hidden md:block capitalize">{planName}</div>
            <div className="hidden md:block">{usage}</div>
            <div className="hidden md:block">{expires}</div>
            <div className="hidden md:block">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${coupon.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                    {coupon.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div className="hidden md:flex justify-end space-x-2">
                <button onClick={() => onEdit(coupon)} className="p-2 text-text-secondary hover:text-brand"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => onDelete(coupon.id)} className="p-2 text-text-secondary hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
            </div>
        </div>
    );
};

const CouponForm: React.FC<{
    plans: Plan[];
    coupon: Coupon | null;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
}> = ({ plans, coupon, onSave, onCancel }) => {
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [usageLimit, setUsageLimit] = useState('');
    const [applicablePlanId, setApplicablePlanId] = useState<string>('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (coupon) {
            setCode(coupon.code);
            setDiscountType(coupon.discount_type);
            setDiscountValue(String(coupon.discount_value));
            setExpiresAt(coupon.expires_at ? coupon.expires_at.substring(0, 10) : '');
            setUsageLimit(coupon.usage_limit ? String(coupon.usage_limit) : '');
            setApplicablePlanId(coupon.applicable_plan_id ? String(coupon.applicable_plan_id) : '');
            setIsActive(coupon.is_active);
        } else {
             // Reset form for 'new'
            setCode(Math.random().toString(36).substring(2, 10).toUpperCase());
            setDiscountType('percentage');
            setDiscountValue('');
            setExpiresAt('');
            setUsageLimit('');
            setApplicablePlanId('');
            setIsActive(true);
        }
    }, [coupon]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const couponData = {
            code,
            discount_type: discountType,
            discount_value: Number(discountValue),
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            usage_limit: usageLimit ? Number(usageLimit) : null,
            applicable_plan_id: applicablePlanId ? Number(applicablePlanId) : null,
            is_active: isActive
        };
        onSave(couponData);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-background border border-border rounded-lg space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input type="text" placeholder="Coupon Code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required className="p-2 bg-panel-light border border-border rounded" />
                <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="p-2 bg-panel-light border border-border rounded">
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed Amount</option>
                </select>
                <input type="number" placeholder="Discount Value" value={discountValue} onChange={e => setDiscountValue(e.target.value)} required className="p-2 bg-panel-light border border-border rounded" />
                <input type="date" placeholder="Expiration Date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="p-2 bg-panel-light border border-border rounded" />
                <input type="number" placeholder="Usage Limit (optional)" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} className="p-2 bg-panel-light border border-border rounded" />
                <select value={applicablePlanId} onChange={e => setApplicablePlanId(e.target.value)} className="p-2 bg-panel-light border border-border rounded">
                    <option value="">All Plans</option>
                    {plans.filter(p => p.name !== 'free').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
             <div className="flex items-center gap-2">
                <input type="checkbox" id="is-active-check" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 bg-background border-border rounded text-brand focus:ring-brand"/>
                <label htmlFor="is-active-check" className="text-sm text-text-secondary">Coupon is Active</label>
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-panel-light text-text-primary font-semibold rounded-lg hover:bg-border">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">{coupon ? 'Save Changes' : 'Create Coupon'}</button>
            </div>
        </form>
    );
};


export default AdminPanel;