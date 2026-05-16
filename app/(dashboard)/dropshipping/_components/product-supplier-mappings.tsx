"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData, PaginationState } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { ServiceIntegration } from "@/types/service-integration";
import { PaginatedResponse } from "@/types/pagination";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
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
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Link2,
  RefreshCw,
} from "lucide-react";

// --- Typy ---
interface ProductSupplierMapping {
  id: string;
  marketplace_offer_id?: string;
  marketplaceOfferId?: string;
  supplier_integration_id?: number;
  supplierIntegrationId?: number;
  supplier_product_index?: string;
  supplierProductIndex?: string;
  supplier_integration_name?: string;
  supplierIntegrationName?: string;
}

// --- Schemat formularza ---
const mappingSchema = z.object({
  marketplaceOfferId: z.string().min(1, "ID oferty jest wymagane"),
  supplierIntegrationId: z.string().min(1, "Hurtownia jest wymagana"),
  supplierProductIndex: z.string().min(1, "Indeks produktu jest wymagany"),
});
type MappingFormValues = z.infer<typeof mappingSchema>;

// Pomocnik do odczytu pola z obu formatów
function getField(obj: ProductSupplierMapping, camel: string, snake: string): string {
  return (obj as any)[camel] || (obj as any)[snake] || "";
}

// --- Dialog dodawania/edycji ---
function MappingDialog({
  isOpen,
  onClose,
  editMapping,
  suppliers,
}: {
  isOpen: boolean;
  onClose: () => void;
  editMapping: ProductSupplierMapping | null;
  suppliers: ServiceIntegration[];
}) {
  const queryClient = useQueryClient();
  const isEditing = !!editMapping;

  const form = useForm<MappingFormValues>({
    resolver: zodResolver(mappingSchema),
    defaultValues: {
      marketplaceOfferId: editMapping ? getField(editMapping, "marketplaceOfferId", "marketplace_offer_id") : "",
      supplierIntegrationId: editMapping
        ? String(editMapping.supplierIntegrationId || editMapping.supplier_integration_id || "")
        : "",
      supplierProductIndex: editMapping ? getField(editMapping, "supplierProductIndex", "supplier_product_index") : "",
    },
  });

  // Reset form przy otwarciu
  useState(() => {
    if (isOpen) {
      form.reset({
        marketplaceOfferId: editMapping ? getField(editMapping, "marketplaceOfferId", "marketplace_offer_id") : "",
        supplierIntegrationId: editMapping
          ? String(editMapping.supplierIntegrationId || editMapping.supplier_integration_id || "")
          : "",
        supplierProductIndex: editMapping ? getField(editMapping, "supplierProductIndex", "supplier_product_index") : "",
      });
    }
  });

  const { mutate: saveMapping, isPending } = useMutation({
    mutationFn: async (data: MappingFormValues) => {
      const payload = {
        marketplaceOfferId: data.marketplaceOfferId,
        supplierIntegrationId: parseInt(data.supplierIntegrationId, 10),
        supplierProductIndex: data.supplierProductIndex,
      };
      if (isEditing && editMapping?.id) {
        return api.put(`/product-supplier-mappings/${editMapping.id}`, {
          supplier_product_index: data.supplierProductIndex,
        });
      }
      return api.post("/product-supplier-mappings", payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? "Mapowanie zaktualizowane." : "Mapowanie dodane.");
      queryClient.invalidateQueries({ queryKey: ["productSupplierMappings"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Błąd zapisu mapowania.");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            {isEditing ? "Edytuj mapowanie" : "Dodaj mapowanie"}
          </DialogTitle>
          <DialogDescription>
            Połącz ID oferty z platformy sprzedażowej z indeksem produktu w katalogu hurtowni.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => saveMapping(d))} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="marketplaceOfferId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID oferty (Allegro/Ceneo itp.)</FormLabel>
                  <FormControl>
                    <Input placeholder="np. 17497986076" {...field} disabled={isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplierIntegrationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hurtownia</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz hurtownię..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplierProductIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indeks produktu w hurtowni</FormLabel>
                  <FormControl>
                    <Input placeholder="np. AB123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Zapisz zmiany" : "Dodaj mapowanie"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Komponent główny ---
export function ProductSupplierMappings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMapping, setEditMapping] = useState<ProductSupplierMapping | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 });

  const { data: suppliers } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations", { category: "WHOLESALE" }],
    queryFn: async () => (await api.get("/service-integrations?category=WHOLESALE")).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["productSupplierMappings", pagination],
    queryFn: async () => {
      const res = await api.get(
        `/product-supplier-mappings?page=${pagination.pageIndex + 1}&size=${pagination.pageSize}`
      );
      return res.data as PaginatedResponse<ProductSupplierMapping>;
    },
    placeholderData: keepPreviousData,
  });

  const { mutate: deleteMapping, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => api.delete(`/product-supplier-mappings/${id}`),
    onSuccess: () => {
      toast.success("Mapowanie usunięte.");
      queryClient.invalidateQueries({ queryKey: ["productSupplierMappings"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Nie udało się usunąć mapowania."),
  });

  const columns: ColumnDef<ProductSupplierMapping>[] = useMemo(
    () => [
      {
        accessorKey: "marketplace_offer_id",
        header: "ID oferty (platforma)",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            {getField(row.original, "marketplaceOfferId", "marketplace_offer_id")}
          </span>
        ),
      },
      {
        accessorKey: "supplier_integration_name",
        header: "Hurtownia",
        cell: ({ row }) => (
          <span className="text-sm">
            {getField(row.original, "supplierIntegrationName", "supplier_integration_name") || "—"}
          </span>
        ),
      },
      {
        accessorKey: "supplier_product_index",
        header: "Indeks w hurtowni",
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-sm">
            {getField(row.original, "supplierProductIndex", "supplier_product_index")}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Akcje</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => { setEditMapping(row.original); setDialogOpen(true); }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Link2 className="h-5 w-5 text-primary" />
            Mapowania ofert ↔ Hurtownia
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Przypisz ID oferty z platformy sprzedażowej do indeksu produktu w katalogu hurtowni. Mapowania są użyte automatycznie przy tworzeniu zleceń.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["productSupplierMappings"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </Button>
          <Button
            size="sm"
            onClick={() => { setEditMapping(null); setDialogOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj mapowanie
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        pageCount={data?.pages ?? -1}
        pagination={pagination}
        setPagination={setPagination}
        isLoading={isLoading && !data}
      />

      {/* Dialog dodawania/edycji */}
      <MappingDialog
        isOpen={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditMapping(null); }}
        editMapping={editMapping}
        suppliers={suppliers ?? []}
      />

      {/* Potwierdzenie usunięcia */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń mapowanie?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Mapowanie zostanie trwale usunięte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMapping(deleteId)}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
