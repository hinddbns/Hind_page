"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";

export default function PasswordInput({
  value,
  onChange,
  required,
  minLength,
  id,
  autoComplete,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  id?: string;
  autoComplete?: string;
  className?: string;
}) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="relative">
      <input
        id={inputId}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-primary-light bg-white px-4 py-2.5 pe-11 text-ink outline-none focus:border-primary ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t.common.hidePassword : t.common.showPassword}
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-ink-soft hover:text-primary"
      >
        {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}
