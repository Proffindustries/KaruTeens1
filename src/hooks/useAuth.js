import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';

// --- Auth Hook ---
export const useAuth = () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return { token, user, isAuthenticated: !!token };
};

// --- Auth Mutations ---

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
            navigate('/login', { state: location.state }); // Pass the redirect state to login
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Registration failed', 'error');
        }
    });
};

export const useLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (credentials) => {
            const { data } = await api.post('/auth/login', credentials);
            return data;
        },
        onSuccess: (data) => {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showToast(`Welcome back, ${data.user.username}!`, 'success');

            const from = location.state?.from?.pathname || '/feed';
            navigate(from, { replace: true });
            window.location.reload(); // Force reload to trigger WS connect with new token
        },
        onError: (err) => {
            showToast(err.response?.data?.error || 'Login failed', 'error');
        }
    });
};

export const useLogout = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    return () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        queryClient.clear();
        navigate('/login');
        window.location.reload(); // Force reload to clear WS
    }
}

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
        }
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
        }
    });
};
