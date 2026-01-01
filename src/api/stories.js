import api from './client';

export const storiesApi = {
    create: (data) => api.post('/stories', data),
    listActive: () => api.get('/stories'),
    getUserStories: (userId) => api.get(`/stories/user/${userId}`),
    markViewed: (storyId) => api.post(`/stories/${storyId}/view`),
    getViewers: (storyId) => api.get(`/stories/${storyId}/viewers`),
};
