// src/app/(dashboard)/superadmin/organizations/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Loader2, Pencil } from "lucide-react";

// Definicja typów danych, które otrzymamy z API
const PlanEnum = z.enum(["FREE", "PRO", "ENTERPRISE"]);
type PlanType = z.infer<typeof PlanEnum>;

interface Organization {
  id: string;
  name: string;
  is_active: boolean;
  plan: PlanType;
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

  // Stan do zarządzania dialogiem edycji
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Sprawdzenie uprawnień super admina
  useEffect(() => {
    if (user && !user.is_super_admin) {
      // W przyszłości, gdy stany użytkownika będą w pełni zarządzane,
      // to przekierowanie ochroni tę stronę.
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Efekt do pobierania danych o organizacjach
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await api.get<Organization[]>(
          "/superadmin/organizations"
        );
        setOrganizations(response.data);
      } catch (err) {
        setError("Nie udało się pobrać listy organizacji.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    // Pobieramy dane tylko, jeśli użytkownik ma uprawnienia
    if (user?.is_super_admin) {
      fetchOrganizations();
    }
  }, [user]);

  // Hook do formularza edycji
  const form = useForm<EditOrganizationSchemaType>({
    resolver: zodResolver(EditOrganizationSchema),
  });

  // Funkcja otwierająca dialog i ustawiająca domyślne wartości formularza
  const handleEditClick = (org: Organization) => {
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

    try {
      const response = await api.patch<Organization>(
        `/superadmin/organizations/${editingOrg.id}`,
        values
      );

      // Aktualizujemy listę organizacji o zaktualizowany element
      setOrganizations(
        organizations.map((org) =>
          org.id === editingOrg.id ? response.data : org
        )
      );
      setIsEditDialogOpen(false); // Zamykamy dialog
    } catch (err) {
      console.error("Błąd podczas aktualizacji organizacji", err);
      // Tutaj można dodać obsługę błędów, np. wyświetlenie toast'a
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  // Zabezpieczenie na wypadek, gdyby ktoś bez uprawnień ominął redirect
  if (!user?.is_super_admin) {
    return <div>Brak uprawnień.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Zarządzanie Organizacjami</h1>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa Organizacji</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>
                  <Badge variant={org.is_active ? "default" : "destructive"}>
                    {org.is_active ? "Aktywna" : "Nieaktywna"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{org.plan}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(org)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog do edycji */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj organizację: {editingOrg?.name}</DialogTitle>
            <DialogDescription>
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
                    <FormLabel>Nazwa Organizacji</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Plan Subskrypcyjny</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Status Aktywności</FormLabel>
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Anuluj
                </Button>
                <Button type="submit">Zapisz zmiany</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
