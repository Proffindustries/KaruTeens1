const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const BASE_URL = 'https://api.giphy.com/v1/stickers';

export const fetchTrendingStickers = async (limit = 20, offset = 0) => {
    if (!GIPHY_API_KEY) return [];
    try {
        const response = await fetch(
            `${BASE_URL}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=pg`,
        );
        const data = await response.json();
        return data.data.map((sticker) => ({
            id: sticker.id,
            url: sticker.images.fixed_height.url, // Optimal for chat
            title: sticker.title,
        }));
    } catch (error) {
        console.error('Error fetching trending stickers:', error);
        return [];
    }
};

export const searchStickers = async (query, limit = 20, offset = 0) => {
    if (!GIPHY_API_KEY || !query.trim()) return [];
    try {
        const response = await fetch(
            `${BASE_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=pg`,
        );
        const data = await response.json();
        return data.data.map((sticker) => ({
            id: sticker.id,
            url: sticker.images.fixed_height.url,
            title: sticker.title,
        }));
    } catch (error) {
        console.error('Error searching stickers:', error);
        return [];
    }
};
