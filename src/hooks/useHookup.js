import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useMyAlias = () => {
    return useQuery({
        queryKey: ['myAlias'],
        queryFn: async () => {
            const { data } = await api.get('/hookup/alias');
            return data;
        },
        retry: false
    });
};

export const useCreateAlias = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.post('/hookup/alias', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myAlias'] });
        }
    });
};

export const useDiscovery = () => {
    return useQuery({
        queryKey: ['hookupDiscovery'],
        queryFn: async () => {
            const { data } = await api.get('/hookup/discover');
            return data;
        },
        staleTime: 30000
    });
};

export const useInteract = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, type }) => {
            const { data } = await api.post(`/hookup/interact/${id}/${type}`);
            return data;
        }
    });
};
