import React from 'react';

interface DashboardPageHeaderProps {
    title: string;
    subtitle?: string;
}

export const DashboardPageHeader: React.FC<DashboardPageHeaderProps> = ({ title, subtitle }) => {
    return (
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-gray-600 sm:text-base">{subtitle}</p>}
        </div>
    );
};