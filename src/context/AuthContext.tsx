"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  must_reset_password: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<User | null>;
  logout: () => void;
  loading: boolean;
  fetchUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = Cookies.get("token");
    if (savedToken) {
      setToken(savedToken);
      fetchUser().then((fetchedUser) => {
        if (fetchedUser?.must_reset_password) {
          if (!window.location.pathname.includes("update-password")) {
            router.push("/update-password");
          }
        }
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (newToken: string) => {
    Cookies.set("token", newToken, { expires: 7 });
    setToken(newToken);
    const fetchedUser = await fetchUser();

    // After login check if password reset needed
    if (fetchedUser?.must_reset_password) {
      router.push("/update-password");
    }

    return fetchedUser;
  };

  const fetchUser = async () => {
    try {
      const res = await api.get("/me");
      const userData = res.data.data ?? res.data;
      const role = userData.roles?.[0]?.name ?? userData.role ?? "employee";
      const userObj: User = {
        ...userData,
        role,
        must_reset_password: !!userData.must_reset_password,
      };
      setUser(userObj);
      return userObj;
    } catch {
      logout();
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    Cookies.remove("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);