import axios from 'axios';

const API = axios.create({
  baseURL: 'https://perseus-trader.onrender.com/api/',
});

// Automatically attach the authorization token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;