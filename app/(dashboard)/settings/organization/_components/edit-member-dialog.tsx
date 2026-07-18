// src/app/(dashboard)/settings/organization/_components/edit-member-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";

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

interface EditMemberDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSuccess: (updatedMembership: Membership) => void;
  member: Membership | null;
}

const AVAILABLE_PERMISSIONS = [
  { id: "orders", label: "Zamówienia", desc: "Podgląd i obsługa zamówień", category: "Obsługa" },
  { id: "shipping", label: "Wysyłki & Nabijarka", desc: "Generowanie listów przewozowych i nadawanie", category: "Wysyłka" },
  { id: "inventory", label: "Magazyn & Dropshipping", desc: "Zarządzanie produktami, stanami i hurtowniami", category: "Magazyn" },
  { id: "invoices", label: "Faktury Kosztowe", desc: "Podgląd i łączenie faktur z KSeF/hurtowni", category: "Księgowość" },
  { id: "returns", label: "Zwroty", desc: "Obsługa zwrotów od klientów", category: "Obsługa" },
  { id: "templates", label: "Szablony Odpowiedzi", desc: "Zarządzanie odpowiedziami dla klientów", category: "Obsługa" },
  { id: "integrations", label: "Integracje Allegro/ERP", desc: "Modyfikacja połączeń API oraz kont kurierskich", category: "Ustawienia" },
  { id: "settings", label: "Ustawienia Firmy", desc: "Edycja danych firmy, kont SMTP, konfiguracji Print Hub", category: "Ustawienia" },
  { id: "team", label: "Zarządzanie Zespołem", desc: "Zapraszanie pracowników, edycja uprawnień i ról", category: "Ustawienia" },
  { id: "activity_log", label: "Dziennik Aktywności", desc: "Dostęp do pełnej historii zdarzeń organizacji", category: "Ustawienia" },
];

const PRESETS = [
  { name: "Magazynier", permissions: ["orders", "shipping", "inventory"] },
  { name: "Księgowość", permissions: ["invoices", "returns"] },
  { name: "Obsługa Klienta", permissions: ["orders", "returns", "templates"] },
  { name: "Administrator", permissions: AVAILABLE_PERMISSIONS.map((p) => p.id) },
];

export function EditMemberDialog({ isOpen, setIsOpen, onSuccess, member }: EditMemberDialogProps) {
  const [editRole, setEditRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setEditRole(member.role === "OWNER" ? "ADMIN" : member.role);
      setEditPermissions(member.permissions || []);
    }
  }, [member]);

  const handleEditSubmit = async () => {
    if (!member) return;
    setIsActionLoading(true);
    try {
      const response = await api.patch(`/organization/members/${member.id}`, {
        role: editRole,
        permissions:
          editRole === "ADMIN"
            ? AVAILABLE_PERMISSIONS.map((p) => p.id)
            : editPermissions,
      });
      toast.success("Uprawnienia zostały zaktualizowane.");
      setIsOpen(false);
      onSuccess(response.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Błąd podczas zapisu uprawnień.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const applyPreset = (presetPerms: string[]) => setEditPermissions(presetPerms);

  const togglePermission = (permId: string) => {
    setEditPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const renderPermissions = () => {
    if (editRole === "ADMIN") {
      return (
        <div className="rounded-xl border border-dashed border-white/10 p-6 bg-slate-900/40 text-center text-sm text-slate-400 mt-2">
          <Shield className="h-8 w-8 text-primary mx-auto mb-2 opacity-80" />
          Rola <strong>Administratora</strong> automatycznie posiada pełny dostęp do wszystkich komponentów systemu.
        </div>
      );
    }

    return (
      <div className="space-y-5 mt-2">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Szablony Ról</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.permissions)}
                className="border-white/10 hover:bg-primary/10 hover:text-primary rounded-xl text-xs"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {["Obsługa", "Wysyłka", "Magazyn", "Księgowość", "Ustawienia"].map((category) => {
          const perms = AVAILABLE_PERMISSIONS.filter((p) => p.category === category);
          return (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 border-b border-white/5 pb-1">{category}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {perms.map((perm) => (
                  <div
                    key={perm.id}
                    onClick={() => togglePermission(perm.id)}
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer select-none transition-colors ${
                      editPermissions.includes(perm.id)
                        ? "border-primary bg-primary/5 text-slate-100"
                        : "border-white/5 bg-slate-950/20 text-slate-400 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editPermissions.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                      className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-200">{perm.label}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{perm.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Edytuj Uprawnienia">
      <ModalHeader>
        <h2 className="text-xl font-bold premium-gradient-text">Edytuj Uprawnienia</h2>
        <p className="text-slate-400 text-sm mt-1">
          Zmień rolę lub uprawnienia użytkownika <strong className="text-slate-300">{member?.user.email}</strong>.
        </p>
      </ModalHeader>

      <ModalBody className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200">Rola systemowa</label>
          <select
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as "ADMIN" | "MEMBER")}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="MEMBER">Pracownik (Granularne Uprawnienia)</option>
            <option value="ADMIN">Administrator (Pełny Dostęp)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200">Uprawnienia dostępu</label>
          {renderPermissions()}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsOpen(false)}
          className="rounded-xl text-slate-400 hover:bg-white/5"
        >
          Anuluj
        </Button>
        <Button
          type="button"
          onClick={handleEditSubmit}
          disabled={isActionLoading}
          className="rounded-xl bg-primary text-white"
        >
          {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Zapisz zmiany
        </Button>
      </ModalFooter>
    </Modal>
  );
}
