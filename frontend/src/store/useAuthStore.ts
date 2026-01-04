import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User as AppUser } from '../types/index';

interface AuthState {
    session: Session | null;
    user: AppUser | null; // Profile from 'users' table
    loading: boolean;
    setSession: (session: Session | null) => void;
    setUser: (user: AppUser | null) => void;
    setLoading: (loading: boolean) => void;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    loading: true,
    setSession: (session) => set({ session }),
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),
    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
    },
}));
