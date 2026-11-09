import React, { type ReactNode } from 'react';

interface DashboardOverviewCardProps {
    title: string;
    children: ReactNode;
}

export const DashboardOverviewCard: React.FC<DashboardOverviewCardProps> = ({ title, children }) => {
    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                <h3 className="text-base font-semibold leading-6 text-gray-900">{title}</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">{children}</div>
        </div>
    );
};