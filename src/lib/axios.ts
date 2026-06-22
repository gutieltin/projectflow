import axios from "axios";
import Cookies from "js-cookie";

// Create a custom axios instance pre-configured for your Laravel backend
const api = axios.create({
  baseURL: "https://projectflow-api-uwvz.onrender.com/api/v1", 
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// This runs automatically before EVERY API call
// It grabs your saved token and attaches it so Laravel knows who you are
api.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;