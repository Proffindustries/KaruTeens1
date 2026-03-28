import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = React.memo(() => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirect to login but save the current location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Handle onboarding redirects
    const hasOnboarded = user?.onboarded;
    const isOnboardingPath = location.pathname === '/onboarding';

    // If onboarding status doesn't match current path, redirect appropriately
    if (hasOnboarded === isOnboardingPath) {
        return <Navigate to={hasOnboarded ? '/feed' : '/onboarding'} replace />;
    }

    return <Outlet />;
});

export default ProtectedRoute;
