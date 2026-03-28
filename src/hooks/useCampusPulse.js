import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

// Get campus pulse data
export const useCampusPulse = () => {
    return useQuery({
        queryKey: ['campus-pulse'],
        queryFn: async () => {
            const { data } = await api.get('/stats/campus-pulse');
            return data;
        },
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 30000, // Poll every 30 seconds
    });
};
