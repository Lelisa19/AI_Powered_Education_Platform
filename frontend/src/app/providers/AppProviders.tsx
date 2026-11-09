// frontend/src/app/providers/AppProviders.tsx
import React, { type ReactNode } from 'react';
import { TenantProvider } from './TenantProvider';
import { AuthProvider } from './AuthProvider';

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <TenantProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </TenantProvider>
    );
};
