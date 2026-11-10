import { useEffect, useRef, useState } from 'react';
import {
    isPlatformAdminBackendUnavailableError,
    listPlatformAdmins,
} from '../../platform-admin/services/platform-admin-service';
import type { PlatformAdminAccount } from '../../platform-admin/types/platform-admin.types';

export function usePlatformAdminAssignees(enabled: boolean) {
    const [admins, setAdmins] = useState<PlatformAdminAccount[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [settledKey, setSettledKey] = useState<string | null>(null);

    const requestVersionRef = useRef(0);
    const currentKey = enabled ? 'enabled' : 'disabled';
    const isLoadingAdmins = enabled && settledKey !== currentKey;

    useEffect(() => {
        if (!enabled) return;

        const currentVersion = ++requestVersionRef.current;

        listPlatformAdmins()
            .then((items) => {
                if (currentVersion !== requestVersionRef.current) return;
                setAdmins(items.filter((admin) => admin.isActive));
                setErrorMessage(null);
                setSettledKey('enabled');
            })
            .catch((err: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                setAdmins([]);
                setErrorMessage(
                    isPlatformAdminBackendUnavailableError(err)
                        ? 'Administrator directory endpoint is unavailable; enter an admin ID directly if supported.'
                        : err instanceof Error && err.message
                          ? err.message
                          : 'Unable to load platform administrator directory.'
                );
                setSettledKey('enabled');
            });
    }, [enabled]);

    return {
        admins: enabled ? admins : [],
        isLoadingAdmins,
        adminsLoadNote: enabled ? errorMessage : null,
    };
}

