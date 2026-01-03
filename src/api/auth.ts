import api from './index'; // 


export const registerApi = (data: any) =>
  api.post('/auth/register', data);

export const loginApi = (data: any) =>
  api.post('/auth/login', data);

export const currentUserApi = () =>
  api.get('/auth/currentuser');
