'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface Clinic {
    id: string;
    name: string;
    slug: string;
    modules?: string[]; // Enable optional modules
    logoUrl?: string | null;
}

interface User {
    id: string;
    name: string;
    email: string;
    clinics: Clinic[];
    isSuperAdmin?: boolean;
}

interface AuthContextType {
    user: User | null;
    activeClinic: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User | null>;
    logout: () => void;
    setActiveClinic: (clinicId: string) => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [activeClinic, setActiveClinicState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        console.log('AuthContext: Initializing...');

        // Load from localStorage (only on client)
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            const clinicId = localStorage.getItem('clinicId');
            const userData = localStorage.getItem('user');

            console.log('AuthContext: localStorage data:', {
                hasToken: !!token,
                hasUser: !!userData,
                clinicId
            });

            if (token && userData) {
                try {
                    const parsedUser = JSON.parse(userData);
                    setUser(parsedUser);
                    setActiveClinicState(clinicId);
                    console.log('AuthContext: User loaded from localStorage', parsedUser);
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    localStorage.clear();
                }
            } else {
                console.log('AuthContext: No user in localStorage');
            }
        }

        setIsLoading(false);
        console.log('AuthContext: Initialization complete, isLoading set to false');
    }, []);

    const setActiveClinic = (clinicId: string) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('clinicId', clinicId);
        }
        setActiveClinicState(clinicId);
    };

    const login = async (email: string, password: string) => {
        console.log('AuthContext: login called', { email });

        try {
            const response = await api.post('/auth/login', { email, password });
            console.log('AuthContext: login response', response.data);

            // Backend returns: { access_token, user, clinics }
            const { access_token, user: userData, clinics } = response.data;

            // Merge clinics into user object
            const userWithClinics = {
                ...userData,
                clinics: clinics || []
            };

            if (typeof window !== 'undefined') {
                localStorage.setItem('token', access_token);
                localStorage.setItem('user', JSON.stringify(userWithClinics));
                console.log('AuthContext: saved to localStorage', {
                    token: access_token.substring(0, 20) + '...',
                    user: userWithClinics
                });
            }
            setUser(userWithClinics);

            // If only one clinic, set it automatically
            if (clinics && clinics.length === 1) {
                console.log('AuthContext: auto-selecting single clinic', clinics[0]);
                setActiveClinic(clinics[0].id);
            } else {
                console.log('AuthContext: user has', clinics?.length || 0, 'clinics');
            }

            return userWithClinics;
        } catch (error) {
            console.error('AuthContext: login error', error);
            throw error;
        }
    };

    const logout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('clinicId');
            localStorage.removeItem('user');
        }
        setUser(null);
        setActiveClinicState(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                activeClinic,
                isLoading,
                login,
                logout,
                setActiveClinic,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
