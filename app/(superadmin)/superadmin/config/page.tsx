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
  Sparkles,
  KeyRound,
  TestTube2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────
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

interface AiConfig {
  is_configured: boolean;
  api_key_masked: string;
  updated_at?: string;
}

// ─── Shared UI helpers ───────────────────────────────────────────────────
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

type ActiveTab = "smtp" | "ai";

// ─── SMTP Tab ────────────────────────────────────────────────────────────
function SmtpTab() {
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");

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

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    if (!host || !port || !user || !fromEmail || !fromName) {
      toast.error("Wypełnij wszystkie wymagane pola.");
      return;
    }
    setIsSaving(true);
    try {
      await api.put("/superadmin/config/smtp", {
        host, port: parseInt(port), user,
        password: password || undefined,
        from_email: fromEmail, from_name: fromName, use_tls: useTls,
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
    if (!testEmail) { toast.error("Podaj adres e-mail odbiorcy testowego."); return; }
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
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Mail className="h-4 w-4 text-blue-400" />
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
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Serwer SMTP</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel>Host *</FieldLabel>
              <FormInput value={host} onChange={setHost} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <FieldLabel>Port *</FieldLabel>
              <FormInput type="number" value={port} onChange={setPort} placeholder="587" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <FieldLabel>Nazwa użytkownika / Login *</FieldLabel>
              <FormInput value={user} onChange={setUser} placeholder="noreply@example.com" />
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useTls ? "bg-primary" : "bg-slate-700"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useTls ? "translate-x-6" : "translate-x-1"}`} />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-200">Użyj TLS/STARTTLS</span>
                <p className="text-xs text-slate-500">Zalecane dla większości serwerów SMTP (port 587)</p>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t border-white/5" />

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Dane Nadawcy</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Adres e-mail nadawcy *</FieldLabel>
              <FormInput type="email" value={fromEmail} onChange={setFromEmail} placeholder="noreply@suppsales.pl" />
            </div>
            <div>
              <FieldLabel>Wyświetlana nazwa *</FieldLabel>
              <FormInput value={fromName} onChange={setFromName} placeholder="SuppSales" />
            </div>
          </div>
        </div>

        {config?.updated_at && (
          <p className="text-xs text-slate-500">
            Ostatnia zmiana: {new Date(config.updated_at).toLocaleString("pl-PL")}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-primary hover:bg-primary/90 text-white px-6"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Zapisz konfigurację
          </Button>
        </div>
      </div>

      {/* Test */}
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
            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Wyślij test
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Wyśle wiadomość testową używając aktualnie zapisanej konfiguracji SMTP.
        </p>
      </div>
    </div>
  );
}

// ─── AI / Gemini Tab ─────────────────────────────────────────────────────
function AiTab() {
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; model_info?: string } | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/superadmin/config/ai");
      setAiConfig(res.data);
    } catch {
      toast.error("Błąd podczas wczytywania konfiguracji AI.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    const key = apiKey.trim();
    if (!key) { toast.error("Wpisz klucz API Gemini."); return; }
    if (!key.startsWith("AIzaSy") && !key.startsWith("AQ")) {
      toast.error("Nieprawidłowy format. Klucz Google API musi zaczynać się od 'AIzaSy' lub 'AQ'.");
      return;
    }
    setIsSaving(true);
    setTestResult(null);
    try {
      await api.put("/superadmin/config/ai", { api_key: key });
      setApiKey("");
      toast.success("Klucz Gemini API zapisany i zaszyfrowany ✓");
      await loadConfig();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Błąd podczas zapisywania.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.post("/superadmin/config/ai/test");
      setTestResult(res.data);
      if (res.data.success) toast.success("Połączenie z Gemini API działa ✓");
      else toast.error(res.data.message);
    } catch {
      toast.error("Błąd podczas testu połączenia.");
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">Klucz Gemini API — Globalny</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Jeden klucz dla całej platformy. Używany przez klientów z planem PRO i ENTERPRISE.
            </p>
          </div>
        </div>
        {aiConfig?.is_configured ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">Skonfigurowane</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Nie skonfigurowane</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* Info banner */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
            <div className="text-sm text-slate-300">
              <p className="font-semibold text-violet-300 mb-1.5">Jak działa integracja AI?</p>
              <ul className="space-y-1 text-slate-400 text-xs list-disc ml-4">
                <li>Klucz jest szyfrowany <strong className="text-slate-300">AES-256</strong> i przechowywany w bazie danych.</li>
                <li>Klienci nie mają wiedzy o kluczu ani dostawcy AI.</li>
                <li>Asystent AI dostępny tylko dla planów <strong className="text-violet-300">PRO</strong> i <strong className="text-violet-300">ENTERPRISE</strong>.</li>
                <li>Koszty API Gemini są Twoimi kosztami operacyjnymi, wliczonymi w cenę planów.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Key input */}
        <div>
          <FieldLabel>
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-slate-400" />
              {aiConfig?.is_configured ? "Nowy klucz API (zostaw puste = nie zmieniaj)" : "Klucz Gemini API *"}
            </span>
          </FieldLabel>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={aiConfig?.is_configured ? aiConfig.api_key_masked : "AIzaSy..."}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 text-slate-100 px-4 py-2.5 pr-11 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Pobierz klucz z{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline"
            >
              Google AI Studio → aistudio.google.com/apikey
            </a>
          </p>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`rounded-xl border p-4 flex items-start gap-3 text-sm ${
            testResult.success
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/5 border-red-500/20 text-red-300"
          }`}>
            {testResult.success
              ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            }
            <div>
              <p className="font-semibold">{testResult.message}</p>
              {testResult.model_info && (
                <p className="text-xs opacity-70 mt-0.5">Model: {testResult.model_info}</p>
              )}
            </div>
          </div>
        )}

        {aiConfig?.updated_at && (
          <p className="text-xs text-slate-500">
            Ostatnia aktualizacja: {new Date(aiConfig.updated_at).toLocaleString("pl-PL")}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            onClick={handleTest}
            disabled={isTesting || !aiConfig?.is_configured}
            variant="outline"
            className="rounded-xl border-white/10 hover:bg-white/5 text-slate-200 disabled:opacity-40"
          >
            {isTesting
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <TestTube2 className="mr-2 h-4 w-4" />
            }
            Testuj połączenie
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !apiKey.trim()}
            className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-6 disabled:opacity-40"
          >
            {isSaving
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Save className="mr-2 h-4 w-4" />
            }
            Zapisz klucz
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────
const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "smtp",
    label: "Poczta SMTP",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    id: "ai",
    label: "Integracja AI (Gemini)",
    icon: <Sparkles className="h-4 w-4" />,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────
export default function SuperAdminConfigPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("smtp");

  return (
    <div className="space-y-6 max-w-4xl">
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

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/60 border border-white/8 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`config-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === tab.id
                ? tab.id === "ai"
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-sm"
                  : "bg-white/8 text-slate-100 border border-white/10 shadow-sm"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/4"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "smtp" && <SmtpTab />}
      {activeTab === "ai" && <AiTab />}
    </div>
  );
}
