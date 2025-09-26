import React, { useState, useMemo } from 'react';
import { TrashIcon, PencilIcon } from '../Icons';
import { UserProfile } from '../../types';

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
            <div className="border border-border rounded-lg overflow-x-auto">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 p-3 bg-panel-light text-xs text-text-secondary uppercase tracking-wider font-bold min-w-[700px]">
                    <div>Email</div>
                    <div>Phone</div>
                    <div>Country</div>
                    <div>Plan</div>
                    <div>Credits</div>
                    <div>Role</div>
                    <div className="text-right">Actions</div>
                </div>
                <div className="min-w-[700px]">
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
    <div className="p-4 border-b border-border last:border-b-0 hover:bg-panel-light/50 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center text-sm">
        <div className="text-text-primary font-medium break-all">{user.email}</div>
        <div className="text-text-secondary truncate">{user.phone ?? 'N/A'}</div>
        <div className="text-text-secondary truncate">{user.country ?? 'N/A'}</div>
        <div className="capitalize">{user.plan}</div>
        <div>{user.credits}</div>
        <div className="capitalize">{user.role}</div>
        <div className="flex justify-end space-x-0 md:space-x-2">
            <button onClick={() => onEdit(user)} className="p-1 md:p-2 text-text-secondary hover:text-brand" aria-label={`Edit user ${user.email}`}><PencilIcon className="w-4 h-4" /></button>
            <button onClick={() => onDelete(user)} className="p-1 md:p-2 text-text-secondary hover:text-red-500" aria-label={`Delete user ${user.email}`}><TrashIcon className="w-4 h-4" /></button>
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
        <div className="p-4 bg-brand/10 border-b border-border last:border-b-0 space-y-4 min-w-[700px]">
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

export default UserManagementTab;