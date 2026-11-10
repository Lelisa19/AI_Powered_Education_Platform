import {
    PLATFORM_NAVIGATION_ITEMS,
    SCHOOL_NAVIGATION_ITEMS,
    type NavItem,
} from '../constants/navigation';
import type { DomainClassification } from '../types/tenant.types';

export function getNavigationItems(classification: DomainClassification): NavItem[] {
    if (classification === 'PLATFORM_ADMIN') {
        return PLATFORM_NAVIGATION_ITEMS;
    }

    if (classification === 'SCHOOL') {
        return SCHOOL_NAVIGATION_ITEMS;
    }

    return [];
}

