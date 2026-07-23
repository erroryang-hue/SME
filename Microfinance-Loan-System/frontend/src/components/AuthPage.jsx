import { useState } from "react";
import API from "../api/api";

/* ─────────────────────────────────────────────
   Leaf / logo mark (matches the header)
───────────────────────────────────────────── */
const LogoMark = () => (
  <svg
    className="w-10 h-10 text-emerald-700"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-9 8.2z"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <path d="M9 22V12" />
  </svg>
);

/* ─────────────────────────────────────────────
   Reusable Input
───────────────────────────────────────────── */
const AuthInput = ({ label, type = "text", placeholder, value, onChange, icon }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
      {label}
    </label>
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-3 pr-4 text-gray-800 placeholder-gray-400
          focus:outline-none focus:border-[#044335] focus:ring-2 focus:ring-[#044335]/10 transition duration-200
          ${icon ? "pl-10" : "pl-4"}`}
      />
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Main AuthPage Component
───────────────────────────────────────────── */
export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "borrower",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic client-side validation
    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "register" && !form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password, role: form.role };

      const { data } = await API.post(endpoint, payload);

      // Persist session
      localStorage.setItem("mg_token", data.token);
      localStorage.setItem(
        "mg_user",
        JSON.stringify({ name: data.name, role: data.role })
      );

      onAuthSuccess({ name: data.name, role: data.role });
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setForm({ name: "", email: "", password: "", role: "borrower" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0faf6] via-[#f8fafc] to-[#e9f5f0] flex items-center justify-center p-4 font-sans antialiased">
      {/* Background decorative blobs */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#044335]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white shadow-2xl shadow-[#044335]/10 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#044335] via-emerald-500 to-teal-400" />

          <div className="px-8 pt-8 pb-10">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <LogoMark />
              <div>
                <p className="text-xl font-bold tracking-tight text-[#044335] leading-none">
                  MicroGrow Exchange
                </p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                  Microfinance Loan Platform
                </p>
              </div>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 capitalize
                    ${mode === m
                      ? "bg-[#044335] text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                    }`}
                  id={`auth-tab-${m}`}
                >
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                {mode === "login" ? "Welcome back" : "Get started today"}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {mode === "login"
                  ? "Sign in to access your portal"
                  : "Create your free account in seconds"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
              {/* Name — register only */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  mode === "register" ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <AuthInput
                  label="Full Name"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={update("name")}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />
              </div>

              {/* Email */}
              <AuthInput
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update("email")}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={update("password")}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-3 pl-10 pr-12 text-gray-800 placeholder-gray-400
                      focus:outline-none focus:border-[#044335] focus:ring-2 focus:ring-[#044335]/10 transition duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    tabIndex={-1}
                    id="toggle-password"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Role selector — register only */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  mode === "register" ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    I am a
                  </label>
                  <div className="flex gap-3">
                    {[
                      { value: "borrower", label: "Borrower", icon: "🏢" },
                      { value: "lender", label: "Lender", icon: "🏦" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, role: opt.value }))}
                        id={`role-${opt.value}`}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200
                          ${form.role === opt.value
                            ? "border-[#044335] bg-[#044335]/5 text-[#044335]"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                      >
                        <span>{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm animate-fade-in">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                id="auth-submit"
                disabled={loading}
                className="w-full bg-[#044335] hover:bg-[#065f46] active:scale-[0.99] text-white font-bold py-3.5 rounded-xl
                  transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-[#044335]/20
                  disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mode === "login" ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  <>
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Switch mode link */}
            <p className="text-center text-sm text-gray-400 mt-5">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="text-[#044335] font-semibold hover:underline"
                    id="switch-to-register"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-[#044335] font-semibold hover:underline"
                    id="switch-to-login"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-4">
          © 2024 MicroGrow Exchange · Your data is secured with JWT encryption
        </p>
      </div>
    </div>
  );
}
