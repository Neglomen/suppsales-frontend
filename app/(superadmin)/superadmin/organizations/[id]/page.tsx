// src/app/(dashboard)/superadmin/organizations/[id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// Import UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Building,
  Users,
  PlugZap,
  History,
  ShieldAlert,
  ArrowLeft,
  Lock,
  Save,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface UserMember {
  id: string;
  name: string | null;
  email: string;
}

interface Membership {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  permissions: string[];
  user: UserMember;
}

interface ServiceIntegration {
  id: number;
  name: string;
  provider_type: string;
  category: string;
  is_active: boolean;
  sync_orders: boolean;
  sync_messages: boolean;
  sync_returns: boolean;
  sync_config?: {
    sync_interval_minutes?: number;
    [key: string]: any;
  } | null;
}

interface ActivityLog {
  id: string;
  user_email: string | null;
  user: UserMember | null;
  action: string;
  description: string;
  ip_address: string | null;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  is_active: boolean;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  company_name?: string | null;
  tax_id?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationDetailsPage({ params }: PageProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { id } = use(params);

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [integrations, setIntegrations] = useState<ServiceIntegration[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Form states
  const [editName, setEditName] = useState("");
  const [editPlan, setEditPlan] = useState<"FREE" | "PRO" | "ENTERPRISE">("FREE");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination for logs
  const [logPage, setLogPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    if (user && !user.is_super_admin) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const fetchData = async () => {
    try {
      const orgRes = await api.get<Organization>(`/superadmin/organizations/${id}`);
      setOrg(orgRes.data);
      setEditName(orgRes.data.name);
      setEditPlan(orgRes.data.plan);
      setEditIsActive(orgRes.data.is_active);

      const membersRes = await api.get<Membership[]>(`/superadmin/organizations/${id}/members`);
      setMembers(membersRes.data);

      const integrationsRes = await api.get<ServiceIntegration[]>(`/superadmin/organizations/${id}/integrations`);
      setIntegrations(integrationsRes.data);

      const logsRes = await api.get<any>(`/superadmin/organizations/${id}/activity-logs?page=1&size=20`);
      setLogs(logsRes.data.items);
      setTotalLogs(logsRes.data.total);
    } catch (err) {
      toast.error("Nie udało się pobrać szczegółów organizacji.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_super_admin) {
      fetchData();
    }
  }, [user, id]);

  const handleFetchLogs = async (page: number) => {
    try {
      const logsRes = await api.get<any>(`/superadmin/organizations/${id}/activity-logs?page=${page}&size=20`);
      setLogs(logsRes.data.items);
      setTotalLogs(logsRes.data.total);
    } catch (err) {
      toast.error("Nie udało się załadować kolejnych logów.");
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const response = await api.patch<Organization>(`/superadmin/organizations/${id}`, {
        name: editName,
        plan: editPlan,
        is_active: editIsActive,
      });
      setOrg(response.data);
      toast.success("Zmiany zostały zapisane pomyślnie.");
    } catch (err) {
      toast.error("Błąd podczas zapisywania zmian.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImpersonate = async () => {
    setIsImpersonating(true);
    try {
      const response = await api.post<any>(`/superadmin/organizations/${id}/impersonate`);
      const { access_token } = response.data;

      // Save admin credentials
      const originalToken = useAuthStore.getState().token;
      const originalUser = useAuthStore.getState().user;
      localStorage.setItem("original_admin_auth", JSON.stringify({ token: originalToken, user: originalUser }));

      // Perform login as the client
      useAuthStore.setState({ token: access_token, isAuthenticated: true });

      // Fetch target user context
      const meRes = await api.get("/auth/me");
      useAuthStore.setState({ user: meRes.data });

      toast.success(`Wcielono się pomyślnie. Zalogowano jako ${meRes.data.email}`);
      router.push("/dashboard");
    } catch (err) {
      toast.error("Nie udało się wcielić w klienta.");
      setIsImpersonating(false);
    }
  };

  const handleUpdateIntegration = async (intgId: number, payload: any) => {
    try {
      toast.loading("Zapisywanie ustawień integracji...", { id: "update-intg" });
      const res = await api.patch(`/superadmin/organizations/${id}/integrations/${intgId}`, payload);
      setIntegrations((prev) => prev.map((item) => (item.id === intgId ? res.data : item)));
      toast.success("Ustawienia integracji zostały zaktualizowane!", { id: "update-intg" });
    } catch (err: any) {
      toast.error("Błąd podczas aktualizacji integracji.", { id: "update-intg" });
    }
  };

  const handleTriggerSync = async (intgId: number, type: "orders" | "messages" | "returns" | "erp") => {
    try {
      const label = type === "erp" ? "ERP Subiekt GT" : type;
      toast.loading(`Zlecanie synchronizacji (${label})...`, { id: `sync-${type}` });
      await api.post(`/superadmin/organizations/${id}/integrations/${intgId}/sync-${type}`);
      toast.success(`Synchronizacja (${label}) została pomyślnie zlecona!`, { id: `sync-${type}` });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Błąd zlecenia synchronizacji.`, { id: `sync-${type}` });
    }
  };

  if (!user?.is_super_admin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button & title */}
      <div className="flex items-center gap-4 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/superadmin/organizations")}
            className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-200">{org?.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">ID Organizacji: {org?.id}</p>
          </div>
        </div>

        {/* Impersonacja Button */}
        <Button
          onClick={handleImpersonate}
          disabled={isImpersonating || !org?.is_active}
          className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold flex items-center gap-2 shadow-lg shadow-amber-600/10"
        >
          {isImpersonating ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <Lock className="h-4.5 w-4.5" />
          )}
          Wciel się (Impersonacja)
        </Button>
      </div>

      {/* Tabs list */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-950/20 border border-white/5 p-1 rounded-2xl h-11 mb-6 flex flex-row justify-start max-w-fit overflow-x-auto">
          <TabsTrigger
            value="general"
            className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400 font-bold text-xs h-9"
          >
            <Building className="h-4 w-4 mr-2" /> Dane Ogólne
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400 font-bold text-xs h-9"
          >
            <Users className="h-4 w-4 mr-2" /> Członkowie ({members.length})
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400 font-bold text-xs h-9"
          >
            <PlugZap className="h-4 w-4 mr-2" /> Integracje ({integrations.length})
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400 font-bold text-xs h-9"
          >
            <History className="h-4 w-4 mr-2" /> Dziennik Aktywności
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DANE OGÓLNE */}
        <TabsContent value="general" className="m-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formularz edycji planu/statusu */}
            <Card className="glass border-white/5 bg-slate-900/20 col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base text-slate-200">Ustawienia subskrypcji i statusu</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Aktualizuj status aktywności i abonament organizacji</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Nazwa organizacji</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded-xl border-white/10 bg-slate-950/40 text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Plan subskrypcji</Label>
                  <Select
                    value={editPlan}
                    onValueChange={(v: "FREE" | "PRO" | "ENTERPRISE") => setEditPlan(v)}
                  >
                    <SelectTrigger className="rounded-xl border-white/10 bg-slate-950/40 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="FREE">FREE</SelectItem>
                      <SelectItem value="PRO">PRO</SelectItem>
                      <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/5 p-4 bg-slate-950/20">
                  <div className="space-y-0.5">
                    <Label className="text-slate-200">Status konta firmy</Label>
                    <p className="text-slate-500 text-xs">Blokowanie dostępu do systemu dla członków firmy</p>
                  </div>
                  <Switch
                    checked={editIsActive}
                    onCheckedChange={setEditIsActive}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="rounded-xl bg-primary text-white flex items-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Zapisz zmiany
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dane rejestrowe firmy */}
            <Card className="glass border-white/5 bg-slate-900/20 col-span-1">
              <CardHeader>
                <CardTitle className="text-base text-slate-200">Dane rejestrowe</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Dane firmowe i adresowe podane przez klienta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div>
                  <div className="text-xs text-slate-500">Pełna nazwa rejestrowa</div>
                  <div className="font-bold text-slate-200 mt-0.5">{org?.company_name || <span className="italic text-slate-600">Nie podano</span>}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 font-mono">NIP / Tax ID</div>
                  <div className="font-bold text-slate-200 font-mono mt-0.5">{org?.tax_id || <span className="italic text-slate-600">Brak</span>}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Adres siedziby</div>
                  <div className="font-medium text-slate-300 mt-1 leading-relaxed">
                    {org?.address_street ? (
                      <>
                        {org.address_street}
                        <br />
                        {org.address_postal_code} {org.address_city}
                        <br />
                        {org.address_country}
                      </>
                    ) : (
                      <span className="italic text-slate-600">Brak adresu</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: CZŁONKOWIE */}
        <TabsContent value="members" className="m-0">
          <Card className="glass border-white/5 bg-slate-900/20">
            <Table>
              <TableHeader className="bg-slate-950/40 border-b border-white/5">
                <TableRow>
                  <TableHead className="text-slate-300">Użytkownik</TableHead>
                  <TableHead className="text-slate-300">Rola</TableHead>
                  <TableHead className="text-slate-300">Granularne Uprawnienia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length > 0 ? (
                  members.map((member) => (
                    <TableRow key={member.id} className="border-b border-white/5 hover:bg-white/5">
                      <TableCell>
                        <div className="font-bold text-slate-200">{member.user.name || "Bez imienia"}</div>
                        <div className="text-xs text-slate-500">{member.user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-lg uppercase text-[10px] tracking-wider px-2 py-0.5 border ${
                            member.role === "OWNER"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                              : member.role === "ADMIN"
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {member.role === "OWNER" || member.role === "ADMIN" ? (
                          <span className="text-slate-400 italic">Pełne (Właściciel / Admin)</span>
                        ) : member.permissions && member.permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {member.permissions.map((perm) => (
                              <Badge key={perm} variant="secondary" className="rounded-lg text-[9px] px-1.5 bg-slate-950/40 text-slate-300 border border-white/5">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-destructive font-semibold">Brak uprawnień</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                      Brak członków przypisanych do tej organizacji.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 3: INTEGRACJE */}
        <TabsContent value="integrations" className="m-0">
          <Card className="glass border-white/5 bg-slate-900/20">
            <Table>
              <TableHeader className="bg-slate-950/40 border-b border-white/5">
                <TableRow>
                  <TableHead className="text-slate-300">Integracja / Typ</TableHead>
                  <TableHead className="text-slate-300">Interwał Synchronizacji</TableHead>
                  <TableHead className="text-slate-300">Ustawienia & Flagi Sync</TableHead>
                  <TableHead className="text-slate-300 text-right">Wyzwolenie Ręczne (Superadmin)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.length > 0 ? (
                  integrations.map((intg) => {
                    const currentInterval = intg.sync_config?.sync_interval_minutes || 5;
                    const isMarketplace = intg.category === "MARKETPLACE" || ["ALLEGRO", "EMPIK", "BASELINKER"].includes(intg.provider_type);

                    return (
                      <TableRow key={intg.id} className="border-b border-white/5 hover:bg-white/5">
                        <TableCell className="align-middle">
                          <div className="font-bold text-slate-200 flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-slate-950/60 border border-white/10 text-xs font-bold flex items-center justify-center text-slate-300 uppercase">
                              {(intg.name || "").slice(0, 2)}
                            </div>
                            <div>
                              <div>{intg.name}</div>
                              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                {intg.provider_type} ({intg.category})
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Interwał synchronizacji */}
                        <TableCell className="align-middle">
                          <div className="flex items-center gap-2">
                            <Select
                              value={String(currentInterval)}
                              onValueChange={(val) => {
                                const minutes = parseInt(val, 10);
                                handleUpdateIntegration(intg.id, {
                                  sync_config: {
                                    ...(intg.sync_config || {}),
                                    sync_interval_minutes: minutes,
                                  },
                                });
                              }}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs rounded-xl border-white/10 bg-slate-950/40 text-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="glass">
                                <SelectItem value="5">Co 5 minut</SelectItem>
                                <SelectItem value="10">Co 10 minut</SelectItem>
                                <SelectItem value="15">Co 15 minut</SelectItem>
                                <SelectItem value="30">Co 30 minut</SelectItem>
                                <SelectItem value="60">Co 60 minut</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>

                        {/* Status & Flagi */}
                        <TableCell className="align-middle space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/5 rounded-lg px-2 py-1">
                              <span className="text-[11px] text-slate-300 font-medium">Aktywna:</span>
                              <Switch
                                checked={intg.is_active}
                                onCheckedChange={(val) => handleUpdateIntegration(intg.id, { is_active: val })}
                              />
                            </div>

                            {isMarketplace && (
                              <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/5 rounded-lg px-2 py-1">
                                <span className="text-[11px] text-slate-300 font-medium">Zamówienia:</span>
                                <Switch
                                  checked={intg.sync_orders}
                                  onCheckedChange={(val) => handleUpdateIntegration(intg.id, { sync_orders: val })}
                                />
                              </div>
                            )}

                            {intg.provider_type === "ALLEGRO" && (
                              <>
                                <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/5 rounded-lg px-2 py-1">
                                  <span className="text-[11px] text-slate-300 font-medium">Wiadomości:</span>
                                  <Switch
                                    checked={intg.sync_messages}
                                    onCheckedChange={(val) => handleUpdateIntegration(intg.id, { sync_messages: val })}
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/5 rounded-lg px-2 py-1">
                                  <span className="text-[11px] text-slate-300 font-medium">Zwroty:</span>
                                  <Switch
                                    checked={intg.sync_returns}
                                    onCheckedChange={(val) => handleUpdateIntegration(intg.id, { sync_returns: val })}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>

                        {/* Akcje Ręczne */}
                        <TableCell className="align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isMarketplace && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!intg.is_active || !intg.sync_orders}
                                onClick={() => handleTriggerSync(intg.id, "orders")}
                                className="h-7 text-xs rounded-lg border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-semibold flex items-center gap-1"
                              >
                                <RefreshCw className="h-3 w-3" /> Sync Zamówień
                              </Button>
                            )}

                            {intg.provider_type === "ALLEGRO" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!intg.is_active || !intg.sync_messages}
                                  onClick={() => handleTriggerSync(intg.id, "messages")}
                                  className="h-7 text-xs rounded-lg border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold flex items-center gap-1"
                                >
                                  <RefreshCw className="h-3 w-3" /> Sync Wiadomości
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!intg.is_active || !intg.sync_returns}
                                  onClick={() => handleTriggerSync(intg.id, "returns")}
                                  className="h-7 text-xs rounded-lg border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-semibold flex items-center gap-1"
                                >
                                  <RefreshCw className="h-3 w-3" /> Sync Zwrotów
                                </Button>
                              </>
                            )}

                            {intg.provider_type === "SUBIEKT_GT" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!intg.is_active}
                                onClick={() => handleTriggerSync(intg.id, "erp")}
                                className="h-7 text-xs rounded-lg border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold flex items-center gap-1"
                              >
                                <RefreshCw className="h-3 w-3" /> Zsynchronizuj stany z ERP
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                      Organizacja nie posiada żadnych skonfigurowanych integracji.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 4: DZIENNIK AKTYWNOŚCI */}
        <TabsContent value="logs" className="m-0 space-y-4">
          <Card className="glass border-white/5 bg-slate-900/20">
            <Table>
              <TableHeader className="bg-slate-950/40 border-b border-white/5">
                <TableRow>
                  <TableHead className="text-slate-300">Czas (UTC)</TableHead>
                  <TableHead className="text-slate-300">Użytkownik</TableHead>
                  <TableHead className="text-slate-300">Zdarzenie</TableHead>
                  <TableHead className="text-slate-300">Opis</TableHead>
                  <TableHead className="text-slate-300">Adres IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id} className="border-b border-white/5 hover:bg-white/5 text-xs">
                      <TableCell className="text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("pl-PL")}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-200">
                        {log.user?.name || log.user_email || "System"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg text-[9px] border-white/5 bg-slate-950/60 text-slate-300">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 font-medium">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {log.ip_address || "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      Brak zarejestrowanej aktywności.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalLogs > 20 && (
            <div className="flex justify-center gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                disabled={logPage === 1}
                onClick={() => {
                  const p = logPage - 1;
                  setLogPage(p);
                  handleFetchLogs(p);
                }}
                className="border-white/5 text-slate-300 rounded-xl"
              >
                Poprzednia
              </Button>
              <span className="text-xs text-slate-400">
                Strona <strong className="text-slate-200">{logPage}</strong> z {Math.ceil(totalLogs / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={logPage * 20 >= totalLogs}
                onClick={() => {
                  const p = logPage + 1;
                  setLogPage(p);
                  handleFetchLogs(p);
                }}
                className="border-white/5 text-slate-300 rounded-xl"
              >
                Następna
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
