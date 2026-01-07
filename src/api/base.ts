// src/api/base.ts
export const API_BASE =
  import.meta.env.DEV
    ? 'http://localhost:3000'
    : 'http://127.0.0.1:3000'
