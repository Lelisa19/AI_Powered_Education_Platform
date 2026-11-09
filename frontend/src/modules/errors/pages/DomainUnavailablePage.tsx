import React from 'react';

export const DomainUnavailablePage: React.FC = () => {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center text-gray-900">
            <h1 className="mb-4 text-4xl font-bold text-red-600">Domain Not Recognized</h1>
            <p className="text-lg text-gray-600 max-w-md">
                This domain is not configured as a valid platform or school environment.
                Please check the URL or contact your school administrator if you believe this is an error.
            </p>
        </div>
    );
};