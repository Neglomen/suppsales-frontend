// src/app/(dashboard)/settings/organization/_components/team-members-tab.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  PlusCircle,
  Trash2,
  Users,
  History,
  Mail,
  User,
  Edit2,
  AlertCircle,
  Search,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import { InviteMemberDialog } from "./invite-member-dialog";
import { EditMemberDialog } from "./edit-member-dialog";

// Definicje typów danych
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

interface Invitation {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  permissions: string[];
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

const AVAILABLE_PERMISSIONS = [
  { id: "orders", label: "Zamówienia" },
  { id: "shipping", label: "Wysyłki & Nabijarka" },
  { id: "inventory", label: "Magazyn & Dropshipping" },
  { id: "invoices", label: "Faktury Kosztowe" },
  { id: "returns", label: "Zwroty" },
  { id: "templates", label: "Szablony Odpowiedzi" },
  { id: "integrations", label: "Integracje Allegro/ERP" },
  { id: "settings", label: "Ustawienia Firmy" },
  { id: "team", label: "Zarządzanie Zespołem" },
  { id: "activity_log", label: "Dziennik Aktywności" },
];

export function TeamMembersTab() {
  const { role } = usePermissions();
  const [activeTab, setActiveTab] = useState<string>("members");

  const [members, setMembers] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Filtry dla logów
  const [logFilterAction, setLogFilterAction] = useState<string>("");
  const [logPage, setLogPage] = useState<number>(1);
  const [totalLogs, setTotalLogs] = useState<number>(0);

  // Obsługa dialogów
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Membership | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const response = await api.get<Membership[]>("/organization/members");
      setMembers(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać członków zespołu.");
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  const fetchInvitations = async () => {
    setIsLoadingInvites(true);
    try {
      const response = await api.get<Invitation[]>("/organization/invitations");
      setInvitations(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać zaproszeń.");
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const fetchActivityLogs = async (page = 1, actionFilter = "") => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("size", "20");
      if (actionFilter) params.append("action", actionFilter);
      
      const response = await api.get<any>("/organization/activity-logs", { params });
      setActivities(response.data.items);
      setTotalLogs(response.data.total);
    } catch (error) {
      toast.error("Nie udało się pobrać dziennika aktywności.");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (activeTab === "invites") {
      fetchInvitations();
    } else if (activeTab === "logs") {
      fetchActivityLogs(logPage, logFilterAction);
    }
  }, [activeTab, logPage, logFilterAction]);

  const handleRemoveMember = async (membershipId: string) => {
    const originalMembers = [...members];
    setMembers(members.filter((m) => m.id !== membershipId));

    try {
      await api.delete(`/organization/members/${membershipId}`);
      toast.success("Członek zespołu został usunięty.");
    } catch (err) {
      setMembers(originalMembers);
      toast.error("Nie udało się usunąć członka.");
    }
  };

  const handleCancelInvitation = async (inviteId: string) => {
    const originalInvites = [...invitations];
    setInvitations(invitations.filter((i) => i.id !== inviteId));

    try {
      await api.delete(`/organization/invitations/${inviteId}`);
      toast.success("Zaproszenie zostało anulowane.");
    } catch (err) {
      setInvitations(originalInvites);
      toast.error("Nie udało się anulować zaproszenia.");
    }
  };

  const handleOpenEdit = (member: Membership) => {
    setEditingMember(member);
    setIsEditOpen(true);
  };

  const handleSuccessInvite = () => {
    if (activeTab === "invites") {
      fetchInvitations();
    }
  };

  const handleSuccessEdit = (updatedMembership: Membership) => {
    setMembers(members.map((m) => (m.id === updatedMembership.id ? updatedMembership : m)));
  };

  return (
    <Card className="glass border-white/5 bg-slate-900/30 shadow-xl rounded-2xl overflow-hidden mt-2">
      <CardHeader className="border-b border-white/5 bg-slate-950/20 py-4 px-6 flex flex-row items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle className="text-lg font-bold premium-gradient-text flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Zarządzanie Zespołem
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Zarządzaj członkami, przypisuj granularne uprawnienia i kontroluj dostęp.
          </CardDescription>
        </div>

        {/* Przycisk Zaproszenia */}
        {(role === "OWNER" || role === "ADMIN") && (
          <div>
            <Button
              onClick={() => setIsInviteOpen(true)}
              className="rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 text-white shadow-lg shadow-primary/20 transition-all duration-300"
            >
              <PlusCircle className="mr-2 h-4.5 w-4.5" /> Zaproś Członka Zespołu
            </Button>

            {isInviteOpen && (
              <InviteMemberDialog
                isOpen={isInviteOpen}
                setIsOpen={setIsInviteOpen}
                onSuccess={handleSuccessInvite}
              />
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-slate-950/10 px-6 border-b border-white/5">
            <TabsList className="bg-transparent h-12 gap-6 p-0">
              <TabsTrigger
                value="members"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none h-full px-1 text-slate-400 font-bold text-sm transition-all"
              >
                <User className="h-4 w-4 mr-2" /> Członkowie ({members.length})
              </TabsTrigger>
              <TabsTrigger
                value="invites"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none h-full px-1 text-slate-400 font-bold text-sm transition-all"
              >
                <Mail className="h-4 w-4 mr-2" /> Zaproszenia ({invitations.length})
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none h-full px-1 text-slate-400 font-bold text-sm transition-all"
              >
                <History className="h-4 w-4 mr-2" /> Dziennik Aktywności
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: CZŁONKOWIE */}
          <TabsContent value="members" className="m-0 p-6">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : members.length > 0 ? (
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-950/20">
                <Table>
                  <TableHeader className="bg-slate-950/40">
                    <TableRow className="border-b border-white/5">
                      <TableHead className="text-slate-300">Użytkownik</TableHead>
                      <TableHead className="text-slate-300">Rola</TableHead>
                      <TableHead className="text-slate-300 hidden md:table-cell">Uprawnienia</TableHead>
                      <TableHead className="text-right text-slate-300">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} className="border-b border-white/5 hover:bg-white/5">
                        <TableCell>
                          <div className="font-semibold text-slate-200">
                            {member.user.name || "Brak imienia"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {member.user.email}
                          </div>
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
                            {member.role === "OWNER" ? "Właściciel" : member.role === "ADMIN" ? "Admin" : "Pracownik"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {member.role === "OWNER" || member.role === "ADMIN" ? (
                            <span className="text-xs text-slate-400">Wszystkie komponenty</span>
                          ) : member.permissions && member.permissions.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {member.permissions.map((perm) => (
                                <Badge key={perm} variant="secondary" className="rounded-lg text-[10px] px-2 py-0.5 bg-slate-950/40 text-slate-300 border border-white/5">
                                  {AVAILABLE_PERMISSIONS.find((p) => p.id === perm)?.label || perm}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Brak dostępnych modułów
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {member.role !== "OWNER" && (role === "OWNER" || role === "ADMIN") && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(member)}
                                  className="h-8 w-8 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/10"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-slate-400 hover:text-destructive rounded-lg hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="glass">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-slate-100">
                                        Czy na pewno chcesz usunąć użytkownika?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-slate-400 text-sm">
                                        Tej operacji nie można cofnąć. Użytkownik{" "}
                                        <strong>{member.user.email}</strong> utraci natychmiastowy dostęp
                                        do tej organizacji.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2">
                                      <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5">Anuluj</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleRemoveMember(member.id)}
                                        className="bg-destructive hover:bg-destructive/95 text-white rounded-xl"
                                      >
                                        Tak, usuń
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-20 border border-white/5 border-dashed rounded-2xl">
                <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">Brak członków zespołu</h3>
                <p className="text-slate-500 text-xs mt-1">Zaproś kogoś za pomocą przycisku powyżej.</p>
              </div>
            )}
          </TabsContent>

          {/* TAB: ZAPROSZENIA */}
          <TabsContent value="invites" className="m-0 p-6">
            {isLoadingInvites ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : invitations.length > 0 ? (
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-950/20">
                <Table>
                  <TableHeader className="bg-slate-950/40">
                    <TableRow className="border-b border-white/5">
                      <TableHead className="text-slate-300">Adres e-mail</TableHead>
                      <TableHead className="text-slate-300">Rola po dołączeniu</TableHead>
                      <TableHead className="text-slate-300 hidden md:table-cell">Zaplanowane uprawnienia</TableHead>
                      <TableHead className="text-right text-slate-300">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invite) => (
                      <TableRow key={invite.id} className="border-b border-white/5 hover:bg-white/5">
                        <TableCell className="font-semibold text-slate-200">
                          {invite.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg uppercase text-[10px] tracking-wider px-2 py-0.5 border border-primary/30 bg-primary/10 text-primary">
                            {invite.role === "ADMIN" ? "Admin" : "Pracownik"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {invite.role === "ADMIN" ? (
                            <span className="text-xs text-slate-400">Wszystkie komponenty</span>
                          ) : invite.permissions && invite.permissions.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {invite.permissions.map((perm) => (
                                <Badge key={perm} variant="secondary" className="rounded-lg text-[10px] px-2 py-0.5 bg-slate-950/40 text-slate-300 border border-white/5">
                                  {AVAILABLE_PERMISSIONS.find((p) => p.id === perm)?.label || perm}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">Brak uprawnień</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(role === "OWNER" || role === "ADMIN") && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-400 hover:text-destructive rounded-lg hover:bg-destructive/10 text-xs px-3"
                                >
                                  Cofnij zaproszenie
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="glass">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-slate-100">Cofnąć zaproszenie?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400 text-sm">
                                    Token zaproszenia dla <strong>{invite.email}</strong> zostanie unieważniony,
                                    uniemożliwiając dołączenie do zespołu.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-2">
                                  <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5">Anuluj</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCancelInvitation(invite.id)}
                                    className="bg-destructive hover:bg-destructive/95 text-white rounded-xl"
                                  >
                                    Cofnij zaproszenie
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-20 border border-white/5 border-dashed rounded-2xl">
                <Mail className="h-10 w-10 text-slate-600 mx-auto mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-slate-300">Brak oczekujących zaproszeń</h3>
                <p className="text-slate-500 text-xs mt-1">Wszystkie zaproszenia zostały już zaakceptowane lub wygasły.</p>
              </div>
            )}
          </TabsContent>

          {/* TAB: DZIENNIK AKTYWNOŚCI */}
          <TabsContent value="logs" className="m-0 p-6">
            <div className="flex items-center gap-4 mb-4 flex-wrap justify-between">
              <div className="flex gap-2 items-center">
                <Select value={logFilterAction} onValueChange={(v) => { setLogFilterAction(v); setLogPage(1); }}>
                  <SelectTrigger className="w-56 rounded-xl border-white/10 bg-slate-950/20 text-slate-300 text-xs h-9">
                    <SelectValue placeholder="Filtruj po typie akcji" />
                  </SelectTrigger>
                  <SelectContent className="glass text-xs">
                    <SelectItem value="ALL_EVENTS">Wszystkie zdarzenia</SelectItem>
                    <SelectItem value="USER_LOGIN">Logowania</SelectItem>
                    <SelectItem value="MEMBER_INVITE">Zaproszenia wysłane</SelectItem>
                    <SelectItem value="MEMBER_JOIN">Członkowie dołączeni</SelectItem>
                    <SelectItem value="MEMBER_UPDATE">Uprawnienia zmienione</SelectItem>
                    <SelectItem value="MEMBER_REMOVE">Członkowie usunięci</SelectItem>
                    <SelectItem value="INVITATION_CANCEL">Zaproszenia cofnięte</SelectItem>
                  </SelectContent>
                </Select>
                {logFilterAction && logFilterAction !== "ALL_EVENTS" && (
                  <Button variant="ghost" onClick={() => setLogFilterAction("")} className="text-xs text-slate-500 h-9">Reset</Button>
                )}
              </div>
              
              <div className="text-xs text-slate-400">
                Wszystkich zdarzeń: <strong className="text-slate-200">{totalLogs}</strong>
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-4">
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-950/20">
                  <Table>
                    <TableHeader className="bg-slate-950/40">
                      <TableRow className="border-b border-white/5">
                        <TableHead className="text-slate-300">Czas (UTC)</TableHead>
                        <TableHead className="text-slate-300">Użytkownik</TableHead>
                        <TableHead className="text-slate-300">Akcja</TableHead>
                        <TableHead className="text-slate-300">Opis</TableHead>
                        <TableHead className="text-slate-300 hidden md:table-cell">IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((log) => (
                        <TableRow key={log.id} className="border-b border-white/5 hover:bg-white/5 text-xs">
                          <TableCell className="text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("pl-PL")}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-300">
                            {log.user?.name || log.user_email || "System"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-lg text-[10px] border-white/5 bg-slate-950/60 text-slate-300">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300 font-medium">
                            {log.description}
                          </TableCell>
                          <TableCell className="text-slate-500 hidden md:table-cell">
                            {log.ip_address || "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginacja */}
                {totalLogs > 20 && (
                  <div className="flex justify-center gap-2 mt-4 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logPage === 1}
                      onClick={() => setLogPage((p) => p - 1)}
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
                      onClick={() => setLogPage((p) => p + 1)}
                      className="border-white/5 text-slate-300 rounded-xl"
                    >
                      Następna
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 border border-white/5 border-dashed rounded-2xl">
                <History className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">Brak logów aktywności</h3>
                <p className="text-slate-500 text-xs mt-1">Brak zdarzeń pasujących do podanych filtrów.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {isEditOpen && (
        <EditMemberDialog
          isOpen={isEditOpen}
          setIsOpen={setIsEditOpen}
          onSuccess={handleSuccessEdit}
          member={editingMember}
        />
      )}
    </Card>
  );
}
