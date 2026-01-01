import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useEvents = (filters = {}) => {
    return useQuery({
        queryKey: ['events', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.category) params.append('category', filters.category);
            if (filters.upcoming !== undefined) params.append('upcoming', filters.upcoming);

            const { data } = await api.get(`/events?${params}`);
            return data;
        },
        refetchInterval: 30000 // Refresh every 30s
    });
};

export const useEvent = (eventId) => {
    return useQuery({
        queryKey: ['event', eventId],
        queryFn: async () => {
            const { data } = await api.get(`/events/${eventId}`);
            return data;
        },
        enabled: !!eventId
    });
};

export const useCreateEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (eventData) => {
            const { data } = await api.post('/events', eventData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        }
    });
};

export const useRSVPEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ eventId, status }) => {
            const { data } = await api.post(`/events/${eventId}/rsvp`, { status });
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
        }
    });
};

export const useRemoveRSVP = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (eventId) => {
            const { data } = await api.delete(`/events/${eventId}/rsvp`);
            return data;
        },
        onSuccess: (_, eventId) => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        }
    });
};
