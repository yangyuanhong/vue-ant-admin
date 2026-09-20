import { message, Modal } from "ant-design-vue";
import axios from "axios";
import { useAuthStore } from "@/stores/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_API + "/api", // url = base url + request url
  timeout: 5000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("quiz_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    const res = response.data;

    if (res.code !== 20000) {
      message.error(res.message || "Error", 5);

      if (res.code === 50008 || res.code === 50012 || res.code === 50014) {
        Modal.confirm({
          title:
            "You have been logged out, you can cancel to stay on this page, or log in again",
          content: "Confirm logout",
          type: "warning",
        });
        useAuthStore().resetToken();
        location.reload();
      }
      return Promise.reject(new Error(res.message || "Error"));
    } else {
      return res;
    }
  },
  (error) => {
    message.error(error.message, 5);
    return Promise.reject(error);
  },
);

export default api;
