"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
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
  ImageIcon,
  Search,
  X,
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
  marketplace_offer_name?: string;
  marketplaceOfferName?: string;
  marketplace_offer_image_url?: string;
  marketplaceOfferImageUrl?: string;
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

  // Reset form przy otwarciu lub zmianie obiektu edycji
  useEffect(() => {
    if (isOpen) {
      form.reset({
        marketplaceOfferId: editMapping ? getField(editMapping, "marketplaceOfferId", "marketplace_offer_id") : "",
        supplierIntegrationId: editMapping
          ? String(editMapping.supplierIntegrationId || editMapping.supplier_integration_id || "")
          : "",
        supplierProductIndex: editMapping ? getField(editMapping, "supplierProductIndex", "supplier_product_index") : "",
      });
    }
  }, [isOpen, editMapping, form]);

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
      <DialogContent className="sm:max-w-[550px] w-[95vw] p-6 rounded-2xl shadow-xl border border-border bg-card flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Link2 className="h-5 w-5" />
            </div>
            {isEditing ? "Edytuj mapowanie" : "Dodaj mapowanie"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Połącz ID oferty z platformy sprzedażowej z indeksem produktu w katalogu hurtowni.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => saveMapping(d))} className="flex flex-col overflow-hidden space-y-4">
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[55vh] py-1">
              {isEditing && (
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-muted/40 border border-border/80 mb-2 animate-in fade-in duration-200">
                  {getField(editMapping, "marketplaceOfferImageUrl", "marketplace_offer_image_url") ? (
                    <img
                      src={getField(editMapping, "marketplaceOfferImageUrl", "marketplace_offer_image_url")}
                      alt={getField(editMapping, "marketplaceOfferName", "marketplace_offer_name")}
                      className="h-12 w-12 rounded-lg object-contain bg-white p-0.5 border border-border/50 shadow-sm"
                    />
                  ) : (
                    <div className="flex bg-white h-12 w-12 rounded-lg items-center justify-center border border-border/50 text-muted-foreground shadow-sm">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Edytowana Oferta
                    </span>
                    <span className="font-semibold text-sm truncate text-foreground/90 mt-0.5" title={getField(editMapping, "marketplaceOfferName", "marketplace_offer_name")}>
                      {getField(editMapping, "marketplaceOfferName", "marketplace_offer_name") || "Brak nazwy"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/80 mt-0.5">
                      ID: {getField(editMapping, "marketplaceOfferId", "marketplace_offer_id")}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="marketplaceOfferId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        ID oferty (Allegro/Ceneo itp.)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="np. 17497986076" 
                          {...field} 
                          disabled={isEditing} 
                          className="h-10 bg-background border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary transition-all font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierIntegrationId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Hurtownia
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isEditing}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 bg-background border-border/60 focus:ring-primary/40 focus:border-primary transition-all font-medium">
                            <SelectValue placeholder="Wybierz hurtownię..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)} className="font-medium">
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
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Indeks produktu w hurtowni
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="np. AB123456" 
                          {...field} 
                          className="h-10 bg-background border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary transition-all font-mono font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter className="pt-3 border-t border-border/50 gap-2 flex-row justify-end mt-2">
              <Button type="button" variant="outline" onClick={onClose} className="h-10 px-4 font-semibold">
                Anuluj
              </Button>
              <Button type="submit" disabled={isPending} className="h-10 px-5 font-semibold shadow-sm">
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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Obsługa opóźnienia wyszukiwania (debouncing)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  const { data: suppliers } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations", { category: "WHOLESALE" }],
    queryFn: async () => (await api.get("/service-integrations?category=WHOLESALE")).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["productSupplierMappings", pagination, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        size: String(pagination.pageSize),
      });
      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }
      const res = await api.get(`/product-supplier-mappings?${params.toString()}`);
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
        header: "Oferta (platforma)",
        cell: ({ row }) => {
          const offerId = getField(row.original, "marketplaceOfferId", "marketplace_offer_id");
          const offerName = getField(row.original, "marketplaceOfferName", "marketplace_offer_name");
          const imageUrl = getField(row.original, "marketplaceOfferImageUrl", "marketplace_offer_image_url");

          return (
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={offerName || offerId}
                  className="h-10 w-10 min-w-10 rounded-md object-contain bg-white p-0.5 border border-border/50"
                />
              ) : (
                <div className="flex bg-muted/50 h-10 w-10 min-w-10 rounded-md items-center justify-center border border-border/50 text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col overflow-hidden max-w-[280px]">
                <span className="font-medium text-sm truncate animate-in fade-in duration-200" title={offerName || "Brak nazwy oferty"}>
                  {offerName || "Brak nazwy oferty"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground truncate">
                  {offerId}
                </span>
              </div>
            </div>
          );
        },
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
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Link2 className="h-5 w-5 text-primary" />
          Mapowania ofert ↔ Hurtownia
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Przypisz ID oferty z platformy sprzedażowej do indeksu produktu w katalogu hurtowni. Mapowania są użyte automatycznie przy tworzeniu zleceń.
        </p>
      </div>

      {/* Filtry i Wyszukiwanie */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-muted/20 p-3 rounded-xl border border-border/60 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po ID oferty, nazwie lub indeksie..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="pl-9 pr-8 h-9 bg-background border-border/80 focus-visible:ring-primary/30"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearch("");
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-border/80"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["productSupplierMappings"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </Button>
          <Button
            size="sm"
            className="h-9 shadow-sm"
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
