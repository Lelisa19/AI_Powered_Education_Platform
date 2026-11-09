import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SchoolAdminDashboardPage } from '../../modules/school-admin/pages/SchoolAdminDashboardPage';
import { SchoolProfilePage } from '../../modules/school-admin/pages/SchoolProfilePage';
import { SchoolSettingsPage } from '../../modules/school-admin/pages/SchoolSettingsPage';

export const SchoolAdminRoutes: React.FC = () => {
    return (
        <Routes>

            <Route index element={<SchoolAdminDashboardPage />} />


            <Route path="profile" element={<SchoolProfilePage />} />


            <Route path="settings" element={<SchoolSettingsPage />} />
        </Routes>
    );
};