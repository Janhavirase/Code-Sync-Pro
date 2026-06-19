// src/api.js
import axios from 'axios';

// Define the URL once!
const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const apiClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true // Ensures your cookies/tokens are sent cross-origin
});

export default apiClient;