// frontend/src/modules/school-admin/pages/SchoolSettingsPage.tsx
import React from 'react';

export const SchoolSettingsPage: React.FC = () => {
    return (
        <div className="p-6 max-w-5xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Configure foundational operational settings for your institution.</p>
            </div>

            <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                {/* 1. Academic Settings */}
                <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Academic Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                            <input
                                type="text"
                                id="academicYear"
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., 2026/2027"
                            />
                        </div>
                        <div>
                            <label htmlFor="currentTerm" className="block text-sm font-medium text-gray-700 mb-1">Current Term/Semester</label>
                            <select id="currentTerm" defaultValue="" className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" disabled>Select term...</option>
                                <option value="1">Term 1</option>
                                <option value="2">Term 2</option>
                                <option value="3">Term 3</option>
                                <option value="4">Term 4</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="termsPerYear" className="block text-sm font-medium text-gray-700 mb-1">Number of Terms per Year</label>
                            <input
                                type="number"
                                id="termsPerYear"
                                min="1"
                                max="6"
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Academic Year Start Date</label>
                            <input
                                type="date"
                                id="startDate"
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Academic Year End Date</label>
                            <input
                                type="date"
                                id="endDate"
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </section>

                {/* 2. Regional Settings */}
                <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Regional Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                            <select id="country" defaultValue="" className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" disabled>Select country...</option>
                                <option value="ET">Ethiopia</option>
                                <option value="KE">Kenya</option>
                                <option value="RW">Rwanda</option>
                                <option value="UG">Uganda</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                            <select id="timezone" defaultValue="" className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" disabled>Select time zone...</option>
                                <option value="Africa/Addis_Ababa">Africa/Addis Ababa (EAT)</option>
                                <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
                            <select id="language" defaultValue="" className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" disabled>Select language...</option>
                                <option value="en">English</option>
                                <option value="om">Afaan Oromoo</option>
                                <option value="am">Amharic</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="calendarSystem" className="block text-sm font-medium text-gray-700 mb-1">Calendar System</label>
                            <select id="calendarSystem" defaultValue="" className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" disabled>Select calendar system...</option>
                                <option value="gregorian">Gregorian</option>
                                <option value="ethiopian">Ethiopian</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* 3. Notification Settings */}
                <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Notification Settings</h2>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="announcements"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            />
                            <label htmlFor="announcements" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
                                School announcements enabled
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="emailNotifications"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            />
                            <label htmlFor="emailNotifications" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
                                Email notifications enabled
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="paymentReminders"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            />
                            <label htmlFor="paymentReminders" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
                                Payment reminders enabled
                            </label>
                        </div>
                    </div>
                </section>

                {/* 4. General Settings */}
                <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">General Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                            <select id="currency" defaultValue="" className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" disabled>Select currency...</option>
                                <option value="ETB">ETB (Ethiopian Birr)</option>
                                <option value="USD">USD (US Dollar)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="enrollmentStatus" className="block text-sm font-medium text-gray-700 mb-1">Default Enrollment Status</label>
                            <select id="enrollmentStatus" defaultValue="" className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" disabled>Select enrollment status...</option>
                                <option value="pending">Pending</option>
                                <option value="active">Active</option>
                                <option value="waitlisted">Waitlisted</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="operatingStatus" className="block text-sm font-medium text-gray-700 mb-1">School Operating Status</label>
                            <select id="operatingStatus" defaultValue="" className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" disabled>Select operating status...</option>
                                <option value="active">Active / Open</option>
                                <option value="on-break">On Break / Holiday</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        className="bg-gray-900 text-white px-6 py-2.5 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 font-medium transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};