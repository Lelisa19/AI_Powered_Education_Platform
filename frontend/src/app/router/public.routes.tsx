// frontend/src/app/router/public.routes.tsx
import React from 'react';
import { Route } from 'react-router-dom';
import { PlatformLandingPage } from '../../modules/platform-website/pages/PlatformLandingPage';

export const publicRoutes = (
    <React.Fragment>
        <Route path="/" element={<PlatformLandingPage />} />
    </React.Fragment>
);