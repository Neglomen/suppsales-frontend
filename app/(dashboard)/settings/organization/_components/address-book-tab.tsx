// src/app/(dashboard)/settings/organization/_components/address-book-tab.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { DataTable } from "@/components/shared/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { AddressBookFormDialog } from "./address-book-form-dialog";

export interface AddressBookContact {
  id: string;
  name: string;
  email: string;
  notes: string | null;
}

export function AddressBookTab() {
  const [contacts, setContacts] = useState<AddressBookContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] =
    useState<AddressBookContact | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] =
    useState<AddressBookContact | null>(null);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<AddressBookContact[]>("/address-book");
      setContacts(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać książki adresowej.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleSuccess = () => {
    fetchContacts();
    setEditingContact(null);
    setFormOpen(false);
  };

  const openEditDialog = (contact: AddressBookContact) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const openDeleteDialog = (contact: AddressBookContact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;
    await toast.promise(api.delete(`/address-book/${contactToDelete.id}`), {
      loading: "Usuwanie kontaktu...",
      success: () => {
        fetchContacts(); // Odśwież listę
        setDeleteDialogOpen(false); // Zamknij modal
        return "Kontakt usunięty pomyślnie.";
      },
      error: (err) =>
        err.response?.data?.detail || "Nie udało się usunąć kontaktu.",
    });
  };

  const columns: ColumnDef<AddressBookContact>[] = [
    { accessorKey: "name", header: "Nazwa" },
    { accessorKey: "email", header: "Adres e-mail" },
    {
      accessorKey: "notes",
      header: "Notatki",
      cell: ({ row }) => (
        <span className="truncate block max-w-xs">{row.original.notes}</span>
      ),
    },
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
              <DropdownMenuItem onClick={() => openEditDialog(row.original)}>
                <Edit className="mr-2 h-4 w-4" /> Edytuj
              </DropdownMenuItem>
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
            setEditingContact(null);
            setFormOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj kontakt
        </Button>
      </div>
      <DataTable columns={columns} data={contacts} />
      <AddressBookFormDialog
        isOpen={isFormOpen}
        setIsOpen={setFormOpen}
        onSuccess={handleSuccess}
        contact={editingContact}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć kontakt?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tej akcji nie można cofnąć. Kontakt dla
              <strong>{contactToDelete?.email}</strong> zostanie trwale
              usunięty.
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
