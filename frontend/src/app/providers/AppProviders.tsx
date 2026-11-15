// frontend/src/app/providers/AppProviders.tsx
import React, { type ReactNode } from 'react';
import { TenantProvider } from './TenantProvider';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <TenantProvider>
            <AuthProvider>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </AuthProvider>
        </TenantProvider>
    );
};
