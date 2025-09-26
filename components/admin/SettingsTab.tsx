import React, { useState, useEffect } from 'react';
import { TrashIcon, PencilIcon } from '../Icons';
import { Plan, PlanCountryPrice } from '../../types';
import { countryList } from '../../constants';

interface SettingsTabProps {
    plans: Plan[];
    onUpdatePlan: (planId: number, updates: Partial<Plan>) => Promise<void>;
    planCountryPrices: PlanCountryPrice[];
    onAddPlanCountryPrice: (price: Omit<PlanCountryPrice, 'id'>) => Promise<void>;
    onUpdatePlanCountryPrice: (priceId: number, updates: Partial<PlanCountryPrice>) => Promise<void>;
    onDeletePlanCountryPrice: (priceId: number) => Promise<void>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ 
    plans, 
    onUpdatePlan,
    planCountryPrices,
    onAddPlanCountryPrice,
    onUpdatePlanCountryPrice,
    onDeletePlanCountryPrice,
}) => {
    const [editablePlans, setEditablePlans] = useState<Plan[]>(plans);
    const [isSaving, setIsSaving] = useState<Record<number, boolean>>({});

    useEffect(() => {
        setEditablePlans(plans);
    }, [plans]);

    const handlePlanChange = (planId: number, field: keyof Plan, value: string | number) => {
        setEditablePlans(currentPlans => 
            currentPlans.map(p => p.id === planId ? { ...p, [field]: value } : p)
        );
    };
    
    const handleSave = async (plan: Plan) => {
        setIsSaving(prev => ({ ...prev, [plan.id]: true }));
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
            setIsSaving(prev => ({ ...prev, [plan.id]: false }));
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-text-primary mb-6">Membership Plan Settings</h3>
            <div className="space-y-6">
                {editablePlans.map(plan => (
                    <div key={plan.id} className="bg-background p-6 rounded-lg border border-border">
                        <h4 className="text-xl font-semibold capitalize mb-4 text-brand">{plan.name} Plan</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    {plan.name === 'free' ? 'Credits on Sign-up' : 'Credits per Month'}
                                </label>
                                <input 
                                    type="number"
                                    value={plan.credits_per_month}
                                    onChange={e => handlePlanChange(plan.id, 'credits_per_month', parseInt(e.target.value))}
                                    className="w-full p-2 bg-panel-light border border-border rounded-lg"
                                />
                             </div>
                             {plan.name !== 'free' && (
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
                             )}
                        </div>
                        <div className="mt-6 text-right">
                             <button
                                onClick={() => handleSave(plan)}
                                disabled={isSaving[plan.id]}
                                className="px-5 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover disabled:opacity-50"
                             >
                                {isSaving[plan.id] ? 'Saving...' : 'Save Changes'}
                             </button>
                        </div>
                    </div>
                ))}
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
                           <>
                                {/* Desktop View */}
                                <div className="hidden md:grid md:grid-cols-5 gap-3 items-center text-sm">
                                    <div className="capitalize">{getPlanName(p.plan_id)}</div>
                                    <div>{p.country}</div>
                                    <div>{p.price}</div>
                                    <div>{p.currency}</div>
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => handleEdit(p)} className="p-2 text-text-secondary hover:text-brand"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(p.id)} className="p-2 text-text-secondary hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                {/* Mobile View */}
                                <div className="md:hidden text-sm">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-text-primary">{p.country}</p>
                                        <div className="flex flex-shrink-0 space-x-2">
                                            <button onClick={() => handleEdit(p)} className="p-2 text-text-secondary hover:text-brand"><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(p.id)} className="p-2 text-text-secondary hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-text-secondary">
                                        <span className="font-semibold">Plan:</span><span className="text-right capitalize">{getPlanName(p.plan_id)}</span>
                                        <span className="font-semibold">Price:</span><span className="text-right">{p.price}</span>
                                        <span className="font-semibold">Currency:</span><span className="text-right">{p.currency}</span>
                                    </div>
                                </div>
                           </>
                        )}
                    </div>
                ))}
                </div>
            </div>
        </div>
    );
};

export default SettingsTab;