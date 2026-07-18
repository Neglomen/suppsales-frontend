// src/app/(dashboard)/superadmin/organizations/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

// Import komponentów shadcn/ui
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Pencil, Search, Shield, Filter, Eye } from "lucide-react";

// Definicja typów danych, które otrzymamy z API
const PlanEnum = z.enum(["FREE", "PRO", "ENTERPRISE"]);
type PlanType = z.infer<typeof PlanEnum>;

interface Organization {
  id: string;
  name: string;
  is_active: boolean;
  plan: PlanType;
  tax_id?: string | null;
  company_name?: string | null;
}

// Schemat walidacji dla formularza edycji
const EditOrganizationSchema = z.object({
  name: z.string().min(2, { message: "Nazwa musi mieć co najmniej 2 znaki." }),
  is_active: z.boolean(),
  plan: PlanEnum,
});
type EditOrganizationSchemaType = z.infer<typeof EditOrganizationSchema>;

export default function SuperAdminOrganizationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtry i wyszukiwanie
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Stan do zarządzania dialogiem edycji
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sprawdzenie uprawnień super admina
  useEffect(() => {
    if (user && !user.is_super_admin) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Efekt do pobierania danych o organizacjach
  const fetchOrganizations = async () => {
    try {
      const response = await api.get<Organization[]>("/superadmin/organizations");
      setOrganizations(response.data);
    } catch (err) {
      setError("Nie udało się pobrać listy organizacji.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_super_admin) {
      fetchOrganizations();
    }
  }, [user]);

  // Hook do formularza edycji
  const form = useForm<EditOrganizationSchemaType>({
    resolver: zodResolver(EditOrganizationSchema),
  });

  // Funkcja otwierająca dialog i ustawiająca domyślne wartości formularza
  const handleEditClick = (e: React.MouseEvent, org: Organization) => {
    e.stopPropagation(); // Powstrzymujemy przekierowanie do szczegółów
    setEditingOrg(org);
    form.reset({
      name: org.name,
      is_active: org.is_active,
      plan: org.plan,
    });
    setIsEditDialogOpen(true);
  };

  // Funkcja wysyłająca zaktualizowane dane do API
  const handleSaveChanges = async (values: EditOrganizationSchemaType) => {
    if (!editingOrg) return;
    setIsSaving(true);

    try {
      const response = await api.patch<Organization>(
        `/superadmin/organizations/${editingOrg.id}`,
        values
      );

      // Aktualizujemy listę organizacji o zaktualizowany element
      setOrganizations(
        organizations.map((org) =>
          org.id === editingOrg.id ? { ...org, ...response.data } : org
        )
      );
      toast.success("Dane organizacji zostały zaktualizowane.");
      setIsEditDialogOpen(false); // Zamykamy dialog
    } catch (err) {
      toast.error("Wystąpił błąd podczas aktualizacji organizacji.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrowanie i wyszukiwanie klient-side (błyskawiczne i elastyczne)
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      // 1. Wyszukiwanie (nazwa, NIP/tax_id, nazwa firmy)
      const matchesSearch =
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.tax_id && org.tax_id.includes(searchQuery)) ||
        (org.company_name && org.company_name.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Filtrowanie planu
      const matchesPlan = filterPlan === "ALL" || org.plan === filterPlan;

      // 3. Filtrowanie statusu
      const matchesStatus =
        filterStatus === "ALL" ||
        (filterStatus === "ACTIVE" && org.is_active) ||
        (filterStatus === "INACTIVE" && !org.is_active);

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [organizations, searchQuery, filterPlan, filterStatus]);

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

  if (error) {
    return (
      <div className="p-8 text-center glass border-destructive/20 text-destructive max-w-md mx-auto mt-12 rounded-2xl">
        {error}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-full">
            Console
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1 premium-gradient-text">
          Zarządzanie Organizacjami
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Wyszukuj, filtruj, zarządzaj subskrypcjami i statusami kont firmowych klientów.
        </p>
      </div>

      {/* Filtry */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/10 p-4 border border-white/5 rounded-2xl">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Szukaj po nazwie, NIP-ie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-white/10 bg-slate-950/40 text-slate-200"
          />
        </div>

        {/* Plan & Status filters */}
        <div className="flex gap-3 w-full md:w-auto flex-wrap">
          {/* Plan filter */}
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-40 rounded-xl border-white/10 bg-slate-950/20 text-slate-300">
              <SelectValue placeholder="Wybierz plan" />
            </SelectTrigger>
            <SelectContent className="glass">
              <SelectItem value="ALL">Wszystkie plany</SelectItem>
              <SelectItem value="FREE">FREE</SelectItem>
              <SelectItem value="PRO">PRO</SelectItem>
              <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 rounded-xl border-white/10 bg-slate-950/20 text-slate-300">
              <SelectValue placeholder="Status konta" />
            </SelectTrigger>
            <SelectContent className="glass">
              <SelectItem value="ALL">Każdy status</SelectItem>
              <SelectItem value="ACTIVE">Aktywne</SelectItem>
              <SelectItem value="INACTIVE">Nieaktywne</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista / Tabela */}
      <Card className="glass border-white/5 bg-slate-900/30 shadow-xl rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-950/40 border-b border-white/5">
            <TableRow>
              <TableHead className="text-slate-300">Nazwa Organizacji</TableHead>
              <TableHead className="text-slate-300">Nazwa rejestrowa / NIP</TableHead>
              <TableHead className="text-slate-300">Plan</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="text-right text-slate-300">Opcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrganizations.length > 0 ? (
              filteredOrganizations.map((org) => (
                <TableRow
                  key={org.id}
                  onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <TableCell className="font-bold text-slate-200">{org.name}</TableCell>
                  <TableCell className="text-slate-400 text-xs">
                    {org.company_name || <span className="italic text-slate-600">Nie podano</span>}
                    {org.tax_id && <div className="text-[10px] text-slate-500 font-mono mt-0.5">NIP: {org.tax_id}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`rounded-lg uppercase text-[10px] tracking-wider px-2 py-0.5 border ${
                        org.plan === "ENTERPRISE"
                          ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                          : org.plan === "PRO"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      {org.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`rounded-lg text-[10px] px-2 py-0.5 border ${
                        org.is_active
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      }`}
                    >
                      {org.is_active ? "Aktywna" : "Nieaktywna"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                        className="h-8 w-8 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/10"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleEditClick(e, org)}
                        className="h-8 w-8 text-slate-400 hover:text-primary rounded-lg hover:bg-primary/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                  Nie znaleziono żadnej organizacji spełniającej kryteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog do szybkiej edycji */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Edytuj organizację: {editingOrg?.name}</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Zmień dane organizacji. Kliknij "Zapisz", aby zatwierdzić zmiany.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSaveChanges)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200">Nazwa Organizacji</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl border-white/10 bg-slate-950/40 text-slate-100" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200">Plan Subskrypcyjny</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-white/10 bg-slate-950/40 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass">
                        <SelectItem value="FREE">Free</SelectItem>
                        <SelectItem value="PRO">Pro</SelectItem>
                        <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/5 p-4 bg-slate-950/20">
                    <div className="space-y-0.5">
                      <FormLabel className="text-slate-200">Status Aktywności</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="rounded-xl text-slate-400 hover:bg-white/5"
                >
                  Anuluj
                </Button>
                <Button type="submit" disabled={isSaving} className="rounded-xl bg-primary text-white">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz zmiany
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
