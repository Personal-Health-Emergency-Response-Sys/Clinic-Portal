"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Activity, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { ETHIOPIAN_PHONE_REGEX } from "@/lib/constants";
import { ApiError } from "@/lib/api";

const schema = z.object({
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(ETHIOPIAN_PHONE_REGEX, "Use Ethiopian format +2519XXXXXXXX or +2517XXXXXXXX"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError("");
    try {
      await login(data.phone, data.password);
      router.replace("/dashboard");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not sign you in. Please try again.";
      setError(msg);
    }
  }

  return (
    <div className="w-full max-w-md px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-brand-border overflow-hidden">
        <div className="bg-brand-navy px-8 py-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">PersonalHERS</p>
              <p className="text-blue-300 text-xs mt-0.5">Clinic Management Portal</p>
            </div>
          </div>
          <p className="text-blue-200 text-sm">
            Sign in with the phone number on your clinic staff account
          </p>
        </div>

        <div className="px-8 py-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">
            Use the same credentials as the PersonalHERS mobile app
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Phone number"
              type="tel"
              placeholder="+251911234567"
              hint="Ethiopian mobile, including country code"
              error={errors.phone?.message}
              {...register("phone")}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 pr-10 text-sm border border-brand-border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-brand-red">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-brand-red">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Sign in to Portal
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-brand-border flex items-center gap-2 text-xs text-gray-500">
            <Shield className="h-3.5 w-3.5 text-brand-blue flex-shrink-0" />
            Secure access · Only approved clinic accounts can log in
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        Need access? Ask your clinic administrator to invite you as an operator.
      </p>
    </div>
  );
}
