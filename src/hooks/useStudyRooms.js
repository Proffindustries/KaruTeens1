import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useStudyRooms = () => {
    return useQuery({
        queryKey: ['studyRooms'],
        queryFn: async () => {
            const { data } = await api.get('/study-rooms');
            return data;
        },
        refetchInterval: 10000 // Refresh every 10s to show active rooms
    });
};

export const useStudyRoom = (roomId) => {
    return useQuery({
        queryKey: ['studyRoom', roomId],
        queryFn: async () => {
            const { data } = await api.get(`/study-rooms/${roomId}`);
            return data;
        },
        enabled: !!roomId
    });
};

export const useCreateRoom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (roomData) => {
            const { data } = await api.post('/study-rooms', roomData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studyRooms'] });
        }
    });
};

export const useJoinRoom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (roomId) => {
            const { data } = await api.post(`/study-rooms/${roomId}/join`);
            return data;
        },
        onSuccess: (_, roomId) => {
            queryClient.invalidateQueries({ queryKey: ['studyRooms'] });
            queryClient.invalidateQueries({ queryKey: ['studyRoom', roomId] });
        }
    });
};

export const useLeaveRoom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (roomId) => {
            const { data } = await api.post(`/study-rooms/${roomId}/leave`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studyRooms'] });
        }
    });
};

export const useDeleteRoom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (roomId) => {
            const { data } = await api.delete(`/study-rooms/${roomId}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studyRooms'] });
        }
    });
};
