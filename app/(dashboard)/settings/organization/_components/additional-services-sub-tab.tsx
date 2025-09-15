"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { PlusCircle } from "lucide-react";

import { AdditionalServiceMapping } from "@/types/additional-service-mapping";
import { Button } from "@/components/ui/button";
import { AdditionalServiceMappingFormDialog } from "./additional-service-form-dialog";
import { AdditionalServiceMappingsTable } from "./additional-service-mappings-table";
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

const fetchMappings = async (): Promise<AdditionalServiceMapping[]> => {
  const { data } = await api.get("/additional-service-mappings");
  return data;
};

export function AdditionalServicesSubTab() {
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] =
    useState<AdditionalServiceMapping | null>(null);

  const {
    data: mappings,
    isLoading,
    error,
    refetch,
  } = useQuery<AdditionalServiceMapping[]>({
    queryKey: ["additionalServiceMappings"],
    queryFn: fetchMappings,
  });

  if (error) toast.error("Nie udało się pobrać mapowań usług dodatkowych.");

  const handleEdit = (mapping: AdditionalServiceMapping) => {
    setSelectedMapping(mapping);
    setFormOpen(true);
  };

  const handleDeleteRequest = (mapping: AdditionalServiceMapping) => {
    setSelectedMapping(mapping);
    setDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMapping) return;
    await toast.promise(
      api.delete(`/additional-service-mappings/${selectedMapping.id}`),
      {
        loading: "Usuwanie mapowania...",
        success: () => {
          refetch();
          setDeleteAlertOpen(false);
          return "Mapowanie usunięte.";
        },
        error: (err) => err.response?.data?.detail || "Wystąpił błąd.",
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Mapowania Usług Dodatkowych</h3>
          <p className="text-sm text-muted-foreground">
            Zdefiniuj, jak usługi z marketplace (np. "Wniesienie") mają być
            tłumaczone na usługi kurierskie.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedMapping(null);
            setFormOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj mapowanie
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Ładowanie mapowań...</p>
      )}

      {mappings && (
        <AdditionalServiceMappingsTable
          mappings={mappings}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      )}

      <AdditionalServiceMappingFormDialog
        isOpen={isFormOpen}
        setIsOpen={setFormOpen}
        onSuccess={refetch}
        mapping={selectedMapping}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć to mapowanie?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tej akcji nie można cofnąć.
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
