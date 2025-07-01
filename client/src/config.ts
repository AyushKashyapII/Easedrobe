export const API_BASE_URL = 'http://localhost:3000';

export const API_ENDPOINTS = {
    register: `${API_BASE_URL}/api/auth/register`,
    login: `${API_BASE_URL}/api/auth/login`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    me: `${API_BASE_URL}/api/auth/me`,
    clothingItems: `${API_BASE_URL}/api/clothing-items`,
    outfits: `${API_BASE_URL}/api/outfits`,
    shopping: `${API_BASE_URL}/api/shopping`,
} as const; 