import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import { useAuthContext } from '../context/AuthContext.jsx';
import { STALE_TIMES } from '../utils/queryConfig';

export const useAuth = () => {
    return useAuthContext();
};

export const useRegister = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (userData) => {
            const { data } = await api.post('/auth/register', userData);
            return data;
        },
        onSuccess: () => {
            showToast('Account created successfully! Please login.', 'success');
            navigate('/login', { state: location.state });
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Registration failed', 'error');
        },
    });
};

export const useLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const { login } = useAuthContext();

    return useMutation({
        mutationFn: async (credentials) => {
            const { data } = await api.post('/auth/login', credentials);
            return data;
        },
        onSuccess: (data) => {
            if (data.two_factor_required) {
                showToast('2FA code sent to your email', 'info');
                return;
            }
            login(data.token, data.user);
            showToast(`Welcome back, ${data.user.username}!`, 'success');

            const from = location.state?.from?.pathname || '/feed';
            navigate(from, { replace: true });
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Login failed', 'error');
        },
    });
};

export const useVerify2FA = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const { login } = useAuthContext();

    return useMutation({
        mutationFn: async (verifyData) => {
            const { data } = await api.post('/auth/verify-2fa', verifyData);
            return data;
        },
        onSuccess: (data) => {
            login(data.token, data.user);
            showToast(`Login verified! Welcome back, ${data.user.username}!`, 'success');

            const from = location.state?.from?.pathname || '/feed';
            navigate(from, { replace: true });
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Verification failed', 'error');
        },
    });
};

export const useToggle2FA = () => {
    const { showToast } = useToast();
    const { updateUser } = useAuthContext();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/users/2fa/toggle');
            return data;
        },
        onSuccess: (data) => {
            showToast(data.message, 'success');
            queryClient.invalidateQueries(['profile']);
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            currentUser.is_2fa_enabled = data.is_2fa_enabled;
            updateUser(currentUser);
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to toggle 2FA', 'error');
        },
    });
};

export const useLogout = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { logout } = useAuthContext();

    return async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            logout();
            queryClient.clear();
            navigate('/login');
        }
    };
};

export const useForgotPassword = () => {
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (email) => {
            const { data } = await api.post('/auth/forgot-password', { email });
            return data;
        },
        onSuccess: (data) => {
            showToast(data.message, 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to request reset', 'error');
        },
    });
};

export const useResetPassword = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: async (resetData) => {
            const { data } = await api.post('/auth/reset-password', resetData);
            return data;
        },
        onSuccess: (data) => {
            showToast(data.message, 'success');
            navigate('/login');
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Password reset failed', 'error');
        },
    });
};

export const useUpdateProfile = () => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (profileData) => {
            const { data } = await api.put('/users/update', profileData);
            return data;
        },
        onSuccess: (data) => {
            showToast(data.message || 'Profile updated successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Failed to update profile', 'error');
        },
    });
};
