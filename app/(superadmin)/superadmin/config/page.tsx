// app/(superadmin)/superadmin/config/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Mail,
  Server,
  Shield,
  Loader2,
  Save,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password_masked: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  is_configured: boolean;
  updated_at?: string;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-300 mb-1.5">
      {children}
    </label>
  );
}

function FormInput({
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
}: {
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-xl border border-white/10 bg-slate-950/60 text-slate-100 px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
    />
  );
}

export default function SuperAdminConfigPage() {
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  // Form state
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [useTls, setUseTls] = useState(true);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/superadmin/config/smtp");
      const data: SmtpConfig = res.data;
      setConfig(data);
      setHost(data.host);
      setPort(String(data.port));
      setUser(data.user);
      setFromEmail(data.from_email);
      setFromName(data.from_name);
      setUseTls(data.use_tls);
    } catch {
      toast.error("Błąd podczas wczytywania konfiguracji SMTP.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!host || !port || !user || !fromEmail || !fromName) {
      toast.error("Wypełnij wszystkie wymagane pola.");
      return;
    }
    setIsSaving(true);
    try {
      await api.put("/superadmin/config/smtp", {
        host,
        port: parseInt(port),
        user,
        password: password || undefined,
        from_email: fromEmail,
        from_name: fromName,
        use_tls: useTls,
      });
      setPassword("");
      toast.success("Konfiguracja SMTP zapisana i zaszyfrowana ✓");
      await loadConfig();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Błąd podczas zapisywania.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error("Podaj adres e-mail odbiorcy testowego.");
      return;
    }
    setIsTesting(true);
    try {
      await api.post("/superadmin/config/smtp/test", { recipient: testEmail });
      toast.success(`E-mail testowy wysłany do ${testEmail} ✓`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Błąd podczas wysyłki testowej.");
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Konfiguracja Systemu</h1>
          </div>
          <p className="text-slate-400 text-sm ml-13">
            Zarządzaj ustawieniami systemowymi aplikacji SuppSales.
          </p>
        </div>
      </div>

      {/* SMTP Config Card */}
      <div className="rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Mail className="h-4.5 w-4.5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Konfiguracja SMTP — Maile Systemowe</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Poczta używana do wysyłki aktywacji kont, zaproszeń do zespołu i powiadomień systemowych.
              </p>
            </div>
          </div>
          {config?.is_configured ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Skonfigurowane (DB)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Fallback (.env)</span>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Server settings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Server className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Serwer SMTP</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <FieldLabel>Host *</FieldLabel>
                <FormInput
                  value={host}
                  onChange={setHost}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <FieldLabel>Port *</FieldLabel>
                <FormInput
                  type="number"
                  value={port}
                  onChange={setPort}
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <FieldLabel>Nazwa użytkownika / Login *</FieldLabel>
                <FormInput
                  value={user}
                  onChange={setUser}
                  placeholder="noreply@example.com"
                />
              </div>
              <div>
                <FieldLabel>
                  Hasło {config?.is_configured ? "(zostaw puste = nie zmieniaj)" : "*"}
                </FieldLabel>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={config?.is_configured ? config.password_masked : "Hasło SMTP"}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 text-slate-100 px-4 py-2.5 pr-11 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setUseTls(!useTls)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useTls ? "bg-primary" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useTls ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-200">Użyj TLS/STARTTLS</span>
                  <p className="text-xs text-slate-500">Zalecane dla większości serwerów SMTP (port 587)</p>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Sender info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Dane Nadawcy</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Adres e-mail nadawcy *</FieldLabel>
                <FormInput
                  type="email"
                  value={fromEmail}
                  onChange={setFromEmail}
                  placeholder="noreply@suppsales.pl"
                />
              </div>
              <div>
                <FieldLabel>Wyświetlana nazwa *</FieldLabel>
                <FormInput
                  value={fromName}
                  onChange={setFromName}
                  placeholder="SuppSales"
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          {config?.updated_at && (
            <p className="text-xs text-slate-500">
              Ostatnia zmiana: {new Date(config.updated_at).toLocaleString("pl-PL")}
            </p>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-primary hover:bg-primary/90 text-white px-6"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Zapisz konfigurację
            </Button>
          </div>
        </div>

        {/* Test Email Section */}
        <div className="border-t border-white/5 px-6 py-5 bg-slate-950/20">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Test połączenia</span>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1 max-w-sm">
              <FieldLabel>Adres e-mail odbiorcy testowego</FieldLabel>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 text-slate-100 px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Button
              onClick={handleTest}
              disabled={isTesting}
              variant="outline"
              className="rounded-xl border-white/10 hover:bg-white/5 text-slate-200"
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Wyślij test
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Wyśle wiadomość testową używając aktualnie zapisanej konfiguracji SMTP.
          </p>
        </div>
      </div>
    </div>
  );
}
