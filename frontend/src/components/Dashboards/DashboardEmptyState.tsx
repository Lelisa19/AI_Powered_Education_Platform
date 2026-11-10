import React from 'react';

interface DashboardEmptyStateProps {
    title: string;
    description: string;
    headingLevel?: 'h2' | 'h3';
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
    title,
    description,
    headingLevel = 'h2',
}) => {
    const HeadingTag = headingLevel;

    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center sm:p-12">
            <svg
                className="mb-4 h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
            </svg>
            <HeadingTag className="text-sm font-semibold text-gray-900">{title}</HeadingTag>
            <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
        </div>
    );
};
