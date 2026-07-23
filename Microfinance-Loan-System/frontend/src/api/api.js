import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000",
});

// Attach JWT token to every request automatically
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("mg_token");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Auto-logout on 401 Unauthorized
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Only clear if we had a token (avoid redirect loop on login page)
            if (localStorage.getItem("mg_token")) {
                localStorage.removeItem("mg_token");
                localStorage.removeItem("mg_user");
                window.location.reload();
            }
        }
        return Promise.reject(error);
    }
);

export default API;
