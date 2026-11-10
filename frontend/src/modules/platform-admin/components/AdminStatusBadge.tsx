import React from 'react';
import type { PlatformAdminInvitationStatus } from '../types/platform-admin.types';

interface AdminRoleBadgeProps {
    isSuperAdmin: boolean;
}

export const AdminTierBadge: React.FC<AdminRoleBadgeProps> = ({ isSuperAdmin }) => {
    if (isSuperAdmin) {
        return (
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                Super Admin (Initial)
            </span>
        );
    }

    return (
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Invited Admin
        </span>
    );
};

interface AdminAccountStatusBadgeProps {
    isActive: boolean;
}

export const AdminAccountStatusBadge: React.FC<AdminAccountStatusBadgeProps> = ({ isActive }) => {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                isActive
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
            }`}
        >
            {isActive ? 'Active' : 'Inactive'}
        </span>
    );
};

interface AdminInvitationStatusBadgeProps {
    status: PlatformAdminInvitationStatus;
}

const INVITATION_STYLES: Record<PlatformAdminInvitationStatus, { label: string; classes: string }> = {
    PENDING: {
        label: 'Pending',
        classes: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    ACCEPTED: {
        label: 'Accepted',
        classes: 'border-green-200 bg-green-50 text-green-700',
    },
    EXPIRED: {
        label: 'Expired',
        classes: 'border-gray-200 bg-gray-100 text-gray-700',
    },
    REVOKED: {
        label: 'Revoked',
        classes: 'border-red-200 bg-red-50 text-red-700',
    },
};

export const AdminInvitationStatusBadge: React.FC<AdminInvitationStatusBadgeProps> = ({
    status,
}) => {
    const config = INVITATION_STYLES[status];

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.classes}`}
        >
            {config.label}
        </span>
    );
};

