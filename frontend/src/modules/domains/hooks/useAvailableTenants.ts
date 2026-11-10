import { useCallback, useEffect, useRef, useState } from 'react';
import {
    isTenantBackendUnavailableError,
    listTenants,
} from '../../tenants/services/tenant-management-service';
import type { ManagedTenant } from '../../tenants/types/tenant-management.types';

export function useAvailableTenants(enabled: boolean) {
    const [tenants, setTenants] = useState<ManagedTenant[]>([]);
    const [isLoadingTenants, setIsLoadingTenants] = useState(enabled);
    const [tenantsError, setTenantsError] = useState<string | null>(null);
    const [isTenantsBackendUnavailable, setIsTenantsBackendUnavailable] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);

    const requestVersionRef = useRef(0);

    useEffect(() => {
        if (!enabled) return;

        const currentVersion = ++requestVersionRef.current;

        listTenants({ page: 1, limit: 100 })
            .then((response) => {
                if (currentVersion !== requestVersionRef.current) return;
                setTenants(response.items);
                setTenantsError(null);
                setIsTenantsBackendUnavailable(false);
            })
            .catch((error: unknown) => {
                if (currentVersion !== requestVersionRef.current) return;
                setTenants([]);
                setIsTenantsBackendUnavailable(isTenantBackendUnavailableError(error));
                setTenantsError(
                    error instanceof Error && error.message
                        ? error.message
                        : 'Unable to load available schools.'
                );
            })
            .finally(() => {
                if (currentVersion === requestVersionRef.current) {
                    setIsLoadingTenants(false);
                }
            });
    }, [enabled, reloadTrigger]);

    const reloadTenants = useCallback(() => {
        setIsLoadingTenants(true);
        setTenantsError(null);
        setIsTenantsBackendUnavailable(false);
        setReloadTrigger((prev) => prev + 1);
    }, []);

    return {
        tenants,
        isLoadingTenants,
        tenantsError,
        isTenantsBackendUnavailable,
        reloadTenants,
    };
}

