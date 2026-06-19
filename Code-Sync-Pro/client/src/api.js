// src/api.js
import axios from 'axios';

// Define the URL once!
const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const apiClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true // Ensures your cookies/tokens are sent cross-origin
});

// INTERCEPTOR: Automatically attach the token/user info to every request
apiClient.interceptors.request.use((config) => {
    const userInfoStr = localStorage.getItem('userInfo');
    if (userInfoStr) {
        try {
            const userInfo = JSON.parse(userInfoStr);
            // Handle both structure types: { user: { _id: ... } } OR { _id: ... }
            const userId = userInfo?.user?._id || userInfo?._id;
            
            if (userId) {
                config.headers['x-user-id'] = userId;
            }
        } catch (err) {
            console.error("Failed to parse userInfo for headers:", err);
        }
    }
    return config;
}, (error) => Promise.reject(error));

export default apiClient;