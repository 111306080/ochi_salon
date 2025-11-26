// 定義使用者的角色
export type UserRole = 'customer' | 'designer' | 'manager';

// 使用者資料結構 (對應後端回傳的 user 物件)
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

// 登入 API 回傳的格式
export interface LoginResponse {
  token: string;
  user: User;
  message: string;
}

// 登入表單的資料結構
export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole; // 這一欄很重要，告訴後端我要登入哪張表
}

// 註冊表單的資料結構
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
}