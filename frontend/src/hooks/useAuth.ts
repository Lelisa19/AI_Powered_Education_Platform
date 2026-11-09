import { useContext } from 'react';
import { AuthContext } from '../app/providers/AuthProvider';
import type { AuthContextType } from '../app/providers/AuthProvider';

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider component tree.');
    }

    return context;
}
