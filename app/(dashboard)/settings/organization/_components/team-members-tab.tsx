// src/app/(dashboard)/settings/organization/_components/team-members-tab.tsx
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InviteUserSchema, InviteUserSchemaType } from "@/lib/zod";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";

// Definicje typów danych
interface UserMember {
  id: string;
  name: string | null;
  email: string;
}
interface Membership {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: UserMember;
}

export function TeamMembersTab() {
  const [members, setMembers] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Stan do śledzenia ładowania poszczególnych akcji
  const [isActionLoading, setActionLoading] = useState(false);

  // Funkcja do pobierania członków
  const fetchMembers = async () => {
    // Nie resetujemy isLoading, jeśli to tylko odświeżenie
    if (isLoading) setIsLoading(true);
    try {
      const response = await api.get<Membership[]>("/organization/members");
      setMembers(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać członków zespołu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Hook do formularza zaproszenia
  const form = useForm<InviteUserSchemaType>({
    resolver: zodResolver(InviteUserSchema),
    defaultValues: { email: "" },
  });

  // Funkcja wysyłająca zaproszenie
  const handleInviteSubmit = async (values: InviteUserSchemaType) => {
    setActionLoading(true);
    await toast.promise(api.post("/organization/invitations", values), {
      loading: "Wysyłanie zaproszenia...",
      success: (response) => {
        setInviteDialogOpen(false);
        form.reset();
        // TODO: W przyszłości odświeżymy tutaj listę zaproszeń, a nie członków.
        return `Zaproszenie wysłane do ${values.email}!`;
      },
      error: (err) => {
        const errorMessage =
          err.response?.data?.detail || "Nie udało się wysłać zaproszenia.";
        form.setError("email", { type: "server", message: errorMessage });
        return errorMessage;
      },
    });
    setActionLoading(false);
  };

  // Funkcja usuwająca członka zespołu
  const handleRemoveMember = async (membershipId: string) => {
    const originalMembers = [...members];
    // Optymistyczne UI: usuwamy od razu z interfejsu
    setMembers(members.filter((member) => member.id !== membershipId));

    await toast.promise(api.delete(`/organization/members/${membershipId}`), {
      loading: "Usuwanie członka...",
      success: "Członek zespołu został usunięty.",
      error: (err) => {
        // W razie błędu, przywracamy poprzedni stan
        setMembers(originalMembers);
        return err.response?.data?.detail || "Nie udało się usunąć członka.";
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isInviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Zaproś użytkownika
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zaproś nowego członka zespołu</DialogTitle>
              <DialogDescription>
                Wpisz adres e-mail osoby, którą chcesz zaprosić. Otrzyma ona
                link do dołączenia do Twojej organizacji.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleInviteSubmit)}
                className="space-y-4 py-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adres e-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="nazwa@domena.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setInviteDialogOpen(false)}
                  >
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isActionLoading}>
                    {isActionLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Wyślij zaproszenie
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Użytkownik</TableHead>
              <TableHead>Rola</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length > 0 ? (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">
                      {member.user.name || "Brak imienia"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {member.role.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== "OWNER" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Czy na pewno chcesz usunąć użytkownika?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Tej operacji nie można cofnąć. Użytkownik{" "}
                              <strong>{member.user.email}</strong> utraci dostęp
                              do tej organizacji.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Tak, usuń
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  Nie zaprosiłeś jeszcze nikogo do swojego zespołu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
