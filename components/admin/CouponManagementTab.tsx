import React, { useState, useEffect } from 'react';
import { TrashIcon, PencilIcon, TicketIcon } from '../Icons';
import { Coupon, DiscountType } from '../../types';

interface CouponManagementTabProps {
    coupons: Coupon[];
    onAddCoupon: (couponData: Omit<Coupon, 'id' | 'created_at' | 'times_used'>) => Promise<void>;
    onUpdateCoupon: (couponId: number, updates: Partial<Coupon>) => Promise<void>;
    onDeleteCoupon: (couponId: number) => Promise<void>;
}

const CouponManagementTab: React.FC<CouponManagementTabProps> = ({ coupons, onAddCoupon, onUpdateCoupon, onDeleteCoupon }) => {
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    const handleEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setIsFormVisible(true);
    };

    const handleAddNew = () => {
        setEditingCoupon(null);
        setIsFormVisible(true);
    };

    const handleCancel = () => {
        setEditingCoupon(null);
        setIsFormVisible(false);
    };
    
    const handleDelete = async (couponId: number) => {
        if (window.confirm("Are you sure you want to delete this coupon?")) {
            try {
                await onDeleteCoupon(couponId);
            } catch (error) {
                alert("Failed to delete coupon.");
                console.error(error);
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                    <TicketIcon className="w-7 h-7 text-brand"/>
                    Coupons & Discounts
                </h3>
                {!isFormVisible && (
                    <button onClick={handleAddNew} className="px-4 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover">
                        Add New Coupon
                    </button>
                )}
            </div>
            
            {isFormVisible && (
                <CouponForm 
                    coupon={editingCoupon}
                    onSave={async (data) => {
                        try {
                            if (editingCoupon) {
                                await onUpdateCoupon(editingCoupon.id, data);
                            } else {
                                await onAddCoupon(data as Omit<Coupon, 'id' | 'created_at' | 'times_used'>);
                            }
                            setIsFormVisible(false);
                            setEditingCoupon(null);
                        } catch (error) {
                             alert(`Failed to save coupon: ${error instanceof Error ? error.message : "Unknown error"}`);
                             console.error(error);
                        }
                    }}
                    onCancel={handleCancel}
                />
            )}

            <div className="mt-8 border border-border rounded-lg overflow-hidden">
                <div className="hidden lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 p-3 bg-panel-light text-xs text-text-secondary uppercase tracking-wider font-bold">
                    <div>Code</div>
                    <div>Discount</div>
                    <div>Expires</div>
                    <div>Usage</div>
                    <div>Active</div>
                    <div>Created</div>
                    <div className="text-right">Actions</div>
                </div>
                 <div>
                    {coupons.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(coupon => (
                        <div key={coupon.id} className="p-4 border-b border-border last:border-b-0 hover:bg-panel-light/50">
                             <div className="grid grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-x-4 gap-y-2 lg:items-center text-sm">
                                <div className="col-span-2 lg:col-span-1">
                                    <span className="font-mono text-base font-bold text-brand bg-brand/10 px-2 py-1 rounded">{coupon.code}</span>
                                </div>
                                <div>
                                    <strong className="lg:hidden text-text-primary mr-2">Discount:</strong>
                                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}
                                </div>
                                 <div>
                                    <strong className="lg:hidden text-text-primary mr-2">Expires:</strong>
                                    {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'Never'}
                                 </div>
                                 <div>
                                    <strong className="lg:hidden text-text-primary mr-2">Usage:</strong>
                                    {coupon.times_used} / {coupon.max_uses ?? '∞'}
                                 </div>
                                 <div>
                                    <strong className="lg:hidden text-text-primary mr-2">Active:</strong>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${coupon.is_active ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'}`}>
                                      {coupon.is_active ? 'Yes' : 'No'}
                                    </span>
                                 </div>
                                 <div className="hidden lg:block">
                                    {new Date(coupon.created_at).toLocaleDateString()}
                                 </div>
                                 <div className="col-span-2 lg:col-span-1 flex justify-end items-center space-x-2">
                                    <button onClick={() => handleEdit(coupon)} className="p-2 text-text-secondary hover:text-brand"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(coupon.id)} className="p-2 text-text-secondary hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                 </div>
                             </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};

interface CouponFormProps {
    coupon: Coupon | null;
    onSave: (data: Partial<Coupon>) => void | Promise<void>;
    onCancel: () => void;
}
const CouponForm: React.FC<CouponFormProps> = ({ coupon, onSave, onCancel }) => {
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState<DiscountType>('percentage');
    const [discountValue, setDiscountValue] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState('');
    const [maxUses, setMaxUses] = useState<string>('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (coupon) {
            setCode(coupon.code);
            setDiscountType(coupon.discount_type);
            setDiscountValue(String(coupon.discount_value));
            setExpiresAt(coupon.expires_at ? coupon.expires_at.substring(0, 10) : '');
            setMaxUses(coupon.max_uses ? String(coupon.max_uses) : '');
            setIsActive(coupon.is_active);
        } else {
            // Reset form for new coupon
            setCode('');
            setDiscountType('percentage');
            setDiscountValue('');
            setExpiresAt('');
            setMaxUses('');
            setIsActive(true);
        }
    }, [coupon]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const couponData: Partial<Coupon> = {
            code: code.toUpperCase(),
            discount_type: discountType,
            discount_value: parseFloat(discountValue),
            expires_at: expiresAt || null,
            max_uses: maxUses ? parseInt(maxUses, 10) : null,
            is_active: isActive,
        };
        onSave(couponData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-background p-6 rounded-lg border border-border space-y-4 mb-8 animate-fade-in">
            <h4 className="text-xl font-semibold mb-2">{coupon ? 'Edit Coupon' : 'Create New Coupon'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Coupon Code</label>
                    <input type="text" value={code} onChange={e => setCode(e.target.value)} required className="w-full p-2 bg-panel-light border border-border rounded-lg uppercase" />
                </div>
                 <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-text-secondary mb-1">Discount Value</label>
                        <input type="number" step="any" value={discountValue} onChange={e => setDiscountValue(e.target.value)} required className="w-full p-2 bg-panel-light border border-border rounded-lg" />
                    </div>
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as DiscountType)} className="p-2 bg-panel-light border border-border rounded-lg">
                        <option value="percentage">%</option>
                        <option value="fixed">USD</option>
                    </select>
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Expiration Date (optional)</label>
                    <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full p-2 bg-panel-light border border-border rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Max Uses (optional)</label>
                    <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="e.g., 100" className="w-full p-2 bg-panel-light border border-border rounded-lg" />
                </div>
             </div>
             <div className="flex items-center gap-2">
                <input type="checkbox" id="is-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 bg-background border-border rounded text-brand focus:ring-brand"/>
                <label htmlFor="is-active" className="text-sm font-medium text-text-secondary">Coupon is Active</label>
             </div>
             <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-panel-light text-text-primary font-semibold rounded-lg hover:bg-border">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Save Coupon</button>
            </div>
        </form>
    );
};

export default CouponManagementTab;