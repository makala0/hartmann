import axios from 'axios';

const apiBaseUrl =
    process.env.REACT_APP_API_BASE_URL ||
    (window.location.port === '3000' ? 'http://localhost:8080/api' : '/api');

const apiClient = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;
