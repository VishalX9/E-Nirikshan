'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  employerType: "field",
};

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth({
    redirectIfAuthenticated: true,
    authenticatedRedirectTo: "/dashboard",
  });
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      signIn({ token: data.token, user: data.user });
      router.replace("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-2xl mb-6">
            <span className="text-xl font-bold text-white">EMS</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-black mb-2">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-base text-gray-600">
            {isLogin ? "Enter your credentials to continue" : "Get started with your workspace"}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black mb-1.5">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black placeholder-gray-400 transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="Vishal Jaiswal"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black placeholder-gray-400 transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black placeholder-gray-400 transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="••••••••"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-black mb-1.5">
                Role
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          {/* Employer Type shown only during sign up when role is Employee */}
          {!isLogin && formData.role === 'employee' && (
            <div>
              <label htmlFor="employerType" className="block text-sm font-medium text-black mb-1.5">
                Employer Type
              </label>
              <select
                id="employerType"
                value={formData.employerType}
                onChange={(event) => setFormData({ ...formData, employerType: event.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                required
              >
                <option value="field">Field Employee</option>
                <option value="hq">Headquarter Employee</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2.5 rounded-lg font-medium transition-all hover:bg-gray-800 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black mt-6"
          >
            {loading ? "Processing..." : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            {" "}
            <button
              onClick={() => setIsLogin((prev) => !prev)}
              className="font-medium text-black hover:underline transition-all"
              type="button"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
