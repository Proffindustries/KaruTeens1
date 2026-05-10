import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

const pageQueryKeyMap = {
    '/feed': ['feed'],
    '/messages': ['messages'],
    '/groups': ['groups'],
    '/marketplace': ['marketplace'],
    '/events': ['events'],
    '/study-rooms': ['studyRooms'],
    '/notifications': ['notifications'],
    '/explore': ['feed'],
};

const excludedKeys = [['user'], ['chats'], ['notifications']];

const getQueryKeysForPage = (pathname) => {
    const matched = Object.entries(pageQueryKeyMap).find(([path]) => pathname.startsWith(path));
    return matched ? [matched[1]] : [];
};

export const useDataSweeper = (ttl = 5 * 60 * 1000) => {
    const queryClient = useQueryClient();
    const location = useLocation();
    const timersRef = useRef(new Map());

    useEffect(() => {
        const currentKeys = getQueryKeysForPage(location.pathname);

        timersRef.current.forEach((timer, keyStr) => {
            clearTimeout(timer);
            timersRef.current.delete(keyStr);
        });

        const allKeys = queryClient.getQueryCache().getAll();
        for (const query of allKeys) {
            const keyStr = JSON.stringify(query.queryKey);
            if (timersRef.current.has(keyStr)) continue;

            const isCurrent = currentKeys.some(
                (prefix) =>
                    query.queryKey.length >= prefix.length &&
                    prefix.every((v, i) => query.queryKey[i] === v),
            );
            if (isCurrent) continue;

            const isExcluded = excludedKeys.some(
                (excluded) =>
                    query.queryKey.length >= excluded.length &&
                    excluded.every((v, i) => query.queryKey[i] === v),
            );
            if (isExcluded) continue;

            const timer = setTimeout(() => {
                queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
                timersRef.current.delete(keyStr);
            }, ttl);

            timersRef.current.set(keyStr, timer);
        }

        return () => {
            timersRef.current.forEach((timer) => clearTimeout(timer));
            timersRef.current.clear();
        };
    }, [location.pathname, queryClient, ttl]);
};
