"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  MoreHorizontal,
  PlusCircle,
  Trash2,
  Edit,
  RefreshCw,
} from "lucide-react";

import { DeliveryMethodMapping } from "@/types/delivery-method-mapping";
import { ServiceIntegration } from "@/types/service-integration";
import { PackageDefinition } from "@/types/package-definition";
import { PaginatedResponse } from "@/types/pagination";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
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
import { DeliveryMappingFormDialog } from "./delivery-mapping-form-dialog";
import {
  AllegroIcon,
  BaseLinkerIcon,
  SuusIcon,
} from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function MappingsSubTab() {
  const [data, setData] =
    useState<PaginatedResponse<DeliveryMethodMapping> | null>(null);
  const [couriers, setCouriers] = useState<ServiceIntegration[]>([]);
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] =
    useState<DeliveryMethodMapping | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const queryClient = useQueryClient();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(pagination.pageIndex + 1));
      params.append("size", String(pagination.pageSize));

      const [mappingsRes, couriersRes, packagesRes] = await Promise.all([
        api.get<PaginatedResponse<DeliveryMethodMapping>>(
          "/delivery-method-mappings",
          { params }
        ),
        api.get<ServiceIntegration[]>("/service-integrations", {
          params: { canBeCourier: "true" },
        }),
        api.get<PackageDefinition[]>("/package-definitions"),
      ]);
      setData(mappingsRes.data);
      setCouriers(couriersRes.data);
      setPackages(packagesRes.data);
    } catch (error) {
      toast.error("Nie udało się pobrać danych konfiguracyjnych.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination]); // Odświeżaj dane przy zmianie paginacji

  const handleDiscover = async () => {
    setIsDiscovering(true);
    await toast.promise(api.post("/discovery/trigger-delivery-methods"), {
      loading: "Zlecanie skanowania zamówień...",
      success: () => {
        setTimeout(() => {
          toast.success("Skanowanie zakończone, odświeżanie listy...");
          fetchData();
          queryClient.invalidateQueries({ queryKey: ["shippingConfig"] });
        }, 5000);
        return "Zadanie odkrywania metod dostawy zostało zlecone.";
      },
      error: (err) => err.response?.data?.detail || "Wystąpił błąd.",
    });
    setIsDiscovering(false);
  };

  const handleDelete = async () => {
    if (!selectedMapping) return;
    await toast.promise(
      api.delete(`/delivery-method-mappings/${selectedMapping.id}`),
      {
        loading: "Usuwanie mapowania...",
        success: () => {
          fetchData();
          queryClient.invalidateQueries({ queryKey: ["shippingConfig"] });
          setDeleteAlertOpen(false);
          return "Mapowanie usunięte.";
        },
        error: (err) => err.response?.data?.detail || "Wystąpił błąd.",
      }
    );
  };

  const columns: ColumnDef<DeliveryMethodMapping>[] = useMemo(
    () => [
      {
        header: "Metoda dostawy (Marketplace)",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.source_integration?.provider_type === "ALLEGRO" && (
              <AllegroIcon className="h-5 w-5" />
            )}
            {row.original.source_integration?.provider_type ===
              "BASELINKER" && <BaseLinkerIcon className="h-5 w-5 rounded-sm" />}
            <div className="flex flex-col">
              <span className="font-medium">
                {row.original.marketplace_delivery_method}
              </span>
              <span className="text-xs text-muted-foreground">
                {row.original.source_integration?.name}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Mapowanie kuriera",
        cell: ({ row }) => {
          const courier = couriers.find(
            (c) => c.id === row.original.service_integration_id
          );
          if (!courier)
            return <Badge variant="destructive">Nieskonfigurowane</Badge>;
          return (
            // === NOWA LOGIKA Z IKONAMI ===
            <div className="flex items-center gap-2">
              {courier.provider_type === "ALLEGRO" && (
                <AllegroIcon className="h-5 w-5 flex-shrink-0" />
              )}
              {courier.provider_type === "SUUS" && (
                <SuusIcon className="h-auto w-10 flex-shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">{courier.name}</span>
                <span className="text-xs text-muted-foreground">
                  {row.original.courier_service_code}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        header: "Domyślne opakowanie",
        cell: ({ row }) =>
          packages.find(
            (p) => p.id === row.original.default_package_definition_id
          )?.name || <span className="text-muted-foreground">Brak</span>,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Otwórz menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedMapping(row.original);
                    setFormOpen(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" /> Edytuj
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setSelectedMapping(row.original);
                    setDeleteAlertOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Usuń
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [couriers, packages]
  );

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Button
          onClick={handleDiscover}
          variant="outline"
          disabled={isDiscovering}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isDiscovering && "animate-spin")}
          />
          Skanuj w poszukiwaniu nowych metod
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pageCount={data?.pages ?? -1}
        pagination={pagination}
        setPagination={setPagination}
      />

      <DeliveryMappingFormDialog
        isOpen={isFormOpen}
        setIsOpen={setFormOpen}
        onSuccess={() => {
          fetchData();
          queryClient.invalidateQueries({ queryKey: ["shippingConfig"] });
        }}
        mapping={selectedMapping}
        courierIntegrations={couriers}
        packageDefinitions={packages}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć to mapowanie?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tej akcji nie można cofnąć. Mapowanie dla "
              {selectedMapping?.marketplace_delivery_method}" zostanie trwale
              usunięte.
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
