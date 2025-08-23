// src/app/(dashboard)/settings/organization/_components/smtp-settings-tab.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { DataTable } from "@/components/shared/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  PlusCircle,
  CheckCircle,
  Mail,
  Trash2,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SmtpAccountFormDialog } from "./smtp-account-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

// Definicja typu dla konta SMTP - teraz zawiera wszystkie potrzebne pola
export interface SmtpAccount {
  id: string;
  name: string;
  is_default: boolean;
  host: string;
  user: string;
  port: number;
  use_tls: boolean;
}

export function SmtpSettingsTab() {
  const [accounts, setAccounts] = useState<SmtpAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SmtpAccount | null>(
    null
  );
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<SmtpAccount | null>(
    null
  );

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<SmtpAccount[]>("/smtp-accounts");
      setAccounts(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać listy kont SMTP.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSuccess = () => {
    fetchAccounts();
    setEditingAccount(null);
    setFormOpen(false);
  };

  const openDeleteDialog = (account: SmtpAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;
    await toast.promise(api.delete(`/smtp-accounts/${accountToDelete.id}`), {
      loading: "Usuwanie konta SMTP...",
      success: () => {
        fetchAccounts();
        return "Konto usunięte pomyślnie.";
      },
      error: "Nie udało się usunąć konta.",
    });
  };

  const handleSetDefault = async (accountId: string) => {
    await toast.promise(api.post(`/smtp-accounts/${accountId}/set-default`), {
      loading: "Ustawianie jako domyślne...",
      success: () => {
        fetchAccounts();
        return "Konto zostało ustawione jako domyślne.";
      },
      error: "Nie udało się ustawić konta jako domyślnego.",
    });
  };

  const handleTestConnection = async (accountId: string) => {
    await toast.promise(api.post(`/smtp-accounts/${accountId}/test`), {
      loading: "Testowanie połączenia...",
      success: "Połączenie udane! Wiadomość testowa wysłana.",
      error: (err) =>
        err.response?.data?.detail || "Test połączenia nie powiódł się.",
    });
  };

  const columns: ColumnDef<SmtpAccount>[] = [
    {
      accessorKey: "name",
      header: "Nazwa konta",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name}</span>
          {row.original.is_default && (
            <Badge variant="default">
              <CheckCircle className="h-3 w-3 mr-1" /> Domyślne
            </Badge>
          )}
        </div>
      ),
    },
    { accessorKey: "host", header: "Host SMTP" },
    { accessorKey: "user", header: "Użytkownik (e-mail)" },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingAccount(row.original);
                  setFormOpen(true);
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Edytuj
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleTestConnection(row.original.id)}
              >
                <Mail className="mr-2 h-4 w-4" /> Testuj
              </DropdownMenuItem>
              {!row.original.is_default && (
                <DropdownMenuItem
                  onClick={() => handleSetDefault(row.original.id)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Ustaw jako domyślne
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openDeleteDialog(row.original)}
                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

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
        <Button
          onClick={() => {
            setEditingAccount(null);
            setFormOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj nowe konto SMTP
        </Button>
      </div>
      <DataTable columns={columns} data={accounts} />

      <SmtpAccountFormDialog
        isOpen={isFormOpen}
        setIsOpen={setFormOpen}
        onSuccess={handleSuccess}
        account={editingAccount}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć konto SMTP?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tej akcji nie można cofnąć. Konto "
              <strong>{accountToDelete?.name}</strong>" zostanie trwale
              usunięte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Tak, usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
