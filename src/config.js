// src/config.js
export const API_BASE =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";
