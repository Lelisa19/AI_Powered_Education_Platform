// frontend/src/app/router/auth.routes.tsx
import { Route } from 'react-router-dom';
import LoginPage from '../../modules/auth/pages/LoginPage';
import RegisterPage from '../../modules/auth/pages/RegisterPage';
import { PublicRoute } from './RouteGuards';

export const authRoutes = (
    <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
    </Route>
);