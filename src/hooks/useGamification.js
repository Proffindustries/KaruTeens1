import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { STALE_TIMES } from '../utils/queryConfig';

export const useGamification = (username) => {
    return useQuery({
        queryKey: ['gamification', username],
        queryFn: async () => {
            if (!username) return null;
            const { data } = await api.get(`/users/${username}/gamification`);
            return data;
        },
        enabled: !!username,
        staleTime: STALE_TIMES.USER_PROFILE, // Using standardized constant
    });
};
