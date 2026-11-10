import React from 'react';

export const SchoolProfilePage: React.FC = () => {
    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">School Profile</h1>
                <p className="mt-2 text-sm text-gray-600 sm:text-base">
                    Manage your school's foundational information, contact details, and location.
                </p>
            </div>

            {/* 
        Using onSubmit={(e) => e.preventDefault()} to prevent page reloads 
        since the backend and API integration are not yet implemented.
      */}
            <form
                className="space-y-8 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
                onSubmit={(e) => e.preventDefault()}
            >
                {/* Basic Information Section */}
                <div className="space-y-6 pt-0">
                    <div>
                        <h2 className="text-lg font-medium leading-6 text-gray-900">Basic Information</h2>
                        <p className="mt-1 text-sm text-gray-500">The core identity of your educational institution.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
                        <div className="sm:col-span-4">
                            <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">
                                School Name
                            </label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="schoolName"
                                    id="schoolName"
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="schoolType" className="block text-sm font-medium text-gray-700">
                                School Type
                            </label>
                            <div className="mt-1">
                                <select
                                    id="schoolType"
                                    name="schoolType"
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-white"
                                >
                                    <option value="">Select a type...</option>
                                    <option value="primary">Primary School</option>
                                    <option value="secondary">Secondary School</option>
                                    <option value="high_school">High School</option>
                                    <option value="higher_ed">University / College</option>
                                    <option value="vocational">Vocational Institute</option>
                                </select>
                            </div>
                        </div>

                        <div className="sm:col-span-6">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                School Description
                            </label>
                            <div className="mt-1">
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={3}
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Details Section */}
                <div className="space-y-6 pt-8">
                    <div>
                        <h2 className="text-lg font-medium leading-6 text-gray-900">Contact Details</h2>
                        <p className="mt-1 text-sm text-gray-500">How students, parents, and partners can reach the school.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                School Email
                            </label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                Phone Number
                            </label>
                            <div className="mt-1">
                                <input
                                    type="tel"
                                    name="phone"
                                    id="phone"
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-6">
                            <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                                Website
                            </label>
                            <div className="mt-1">
                                <input
                                    type="url"
                                    name="website"
                                    id="website"
                                    placeholder="https://"
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location Section */}
                <div className="space-y-6 pt-8">
                    <div>
                        <h2 className="text-lg font-medium leading-6 text-gray-900">Location</h2>
                        <p className="mt-1 text-sm text-gray-500">The primary physical address of the institution.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                Physical Address
                            </label>
                            <div className="mt-1">
                                <textarea
                                    id="address"
                                    name="address"
                                    rows={2}
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-8">
                    <button
                        type="button"
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};