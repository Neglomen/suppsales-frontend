"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, PlusCircle, Star, Trash2, Edit } from "lucide-react";

import { PackageDefinition } from "@/types/package-definition";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
import { PackageFormDialog } from "./package-form-dialog";

export function PackagesTab() {
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] =
    useState<PackageDefinition | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<PackageDefinition[]>(
        "/package-definitions"
      );
      setPackages(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać listy opakowań.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSetDefault = async (pkg: PackageDefinition) => {
    await toast.promise(
      api.post(`/package-definitions/${pkg.id}/set-default`),
      {
        loading: "Ustawianie jako domyślne...",
        success: () => {
          fetchData();
          return "Opakowanie ustawione jako domyślne.";
        },
        error: (err) => err.response?.data?.detail || "Wystąpił błąd.",
      }
    );
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;
    await toast.promise(
      api.delete(`/package-definitions/${selectedPackage.id}`),
      {
        loading: "Usuwanie opakowania...",
        success: () => {
          fetchData();
          setDeleteAlertOpen(false);
          return "Opakowanie usunięte.";
        },
        error: (err) => err.response?.data?.detail || "Wystąpił błąd.",
      }
    );
  };

  const columns: ColumnDef<PackageDefinition>[] = [
    {
      accessorKey: "name",
      header: "Nazwa",
      cell: ({ row }) => (
        <div className="font-medium flex items-center">
          {row.original.name}
          {row.original.is_default && (
            <Badge
              variant="default"
              className="ml-2 bg-amber-500 hover:bg-amber-600"
            >
              <Star className="h-3 w-3 mr-1" /> Domyślne
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "Wymiary (dł x szer x wys)",
      cell: ({ row }) =>
        `${row.original.length_cm} x ${row.original.width_cm} x ${row.original.height_cm} cm`,
    },
    {
      accessorKey: "weight_kg",
      header: "Waga",
      cell: ({ row }) => `${row.original.weight_kg} kg`,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!row.original.is_default && (
              <DropdownMenuItem onClick={() => handleSetDefault(row.original)}>
                <Star className="mr-2 h-4 w-4" /> Ustaw jako domyślne
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setSelectedPackage(row.original);
                setFormOpen(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" /> Edytuj
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedPackage(row.original);
                setDeleteAlertOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => {
            setSelectedPackage(null);
            setFormOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Dodaj opakowanie
        </Button>
      </div>
      <DataTable columns={columns} data={packages} isLoading={isLoading} />
      <PackageFormDialog
        isOpen={isFormOpen}
        setIsOpen={setFormOpen}
        onSuccess={fetchData}
        packageDef={selectedPackage}
      />
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć to opakowanie?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tej akcji nie można cofnąć. Opakowanie "{selectedPackage?.name}"
              zostanie trwale usunięte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
