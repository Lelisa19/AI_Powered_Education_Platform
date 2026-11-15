import React from 'react';
import type { PaymentMethod, PaymentStatus } from '../types/accountant.types';

interface PaymentStatusBadgeProps {
    status: PaymentStatus;
    className?: string;
}

const PAYMENT_STATUS_CONFIG: Record<
    PaymentStatus,
    { label: string; badgeClasses: string; dotClasses: string }
> = {
    PENDING_VERIFICATION: {
        label: 'Pending Review',
        badgeClasses: 'border-amber-200 bg-amber-50 text-amber-800',
        dotClasses: 'bg-amber-400',
    },
    VERIFIED: {
        label: 'Verified',
        badgeClasses: 'border-green-200 bg-green-50 text-green-700',
        dotClasses: 'bg-green-500',
    },
    REJECTED: {
        label: 'Rejected',
        badgeClasses: 'border-red-200 bg-red-50 text-red-700',
        dotClasses: 'bg-red-500',
    },
};

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, className = '' }) => {
    const config = PAYMENT_STATUS_CONFIG[status] ?? {
        label: status,
        badgeClasses: 'border-gray-200 bg-gray-50 text-gray-700',
        dotClasses: 'bg-gray-400',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badgeClasses} ${className}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${config.dotClasses}`} aria-hidden="true" />
            {config.label}
        </span>
    );
};

interface PaymentMethodBadgeProps {
    method: PaymentMethod;
    className?: string;
}

const PAYMENT_METHOD_CONFIG: Record<
    PaymentMethod,
    { label: string; badgeClasses: string }
> = {
    TELEBIRR: {
        label: 'Telebirr',
        badgeClasses: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
    CBE_BIRR: {
        label: 'CBE Birr',
        badgeClasses: 'border-purple-200 bg-purple-50 text-purple-800',
    },
    BANK_TRANSFER: {
        label: 'Bank Transfer',
        badgeClasses: 'border-blue-200 bg-blue-50 text-blue-800',
    },
    CASH: {
        label: 'Cash',
        badgeClasses: 'border-gray-200 bg-gray-100 text-gray-800',
    },
    PAGUME: {
        label: 'Pagume',
        badgeClasses: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    },
};

export const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({ method, className = '' }) => {
    const config = PAYMENT_METHOD_CONFIG[method] ?? {
        label: method,
        badgeClasses: 'border-gray-200 bg-gray-50 text-gray-700',
    };

    return (
        <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${config.badgeClasses} ${className}`}
        >
            {config.label}
        </span>
    );
};

