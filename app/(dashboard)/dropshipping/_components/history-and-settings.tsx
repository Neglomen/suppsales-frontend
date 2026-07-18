"use client";

import { useMemo, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import {
  ColumnDef,
  PaginationState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

import api, { getErrorMessage } from "@/lib/api";
import { Organization } from "@/types/organization";
import { AddressBookContact } from "@/types/address-book-contact";
import { SmtpAccount } from "@/types/smtp-account";
import {
  PurchaseOrderBatch,
  PurchaseOrderBatchStatus,
} from "@/types/purchase-order-batch";
import { PaginatedResponse } from "@/types/pagination";
import { DataTable } from "@/components/shared/data-table";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, AlertCircle, Settings, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PurchaseOrder } from "@/types/purchase-order";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropshippingOrdersTab } from "./dropshipping-orders-tab";
import { ShoppingBag } from "lucide-react";

// --- Sekcja Ustawień ---

const settingsSchema = z.object({
  dropshippingRecipientId: z.string().optional(),
  dropshippingSmtpId: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

function SettingsForm() {
  const queryClient = useQueryClient();

  const { data: organization, isLoading: isLoadingOrg } =
    useQuery<Organization>({
      queryKey: ["organization"],
      queryFn: async () => (await api.get("/organization")).data,
    });

  const { data: contacts, isLoading: isLoadingContacts } = useQuery<
    AddressBookContact[]
  >({
    queryKey: ["addressBookContacts"],
    queryFn: async () => (await api.get("/address-book")).data,
  });

  const { data: smtpAccounts, isLoading: isLoadingSmtp } = useQuery<
    SmtpAccount[]
  >({
    queryKey: ["smtpAccounts"],
    queryFn: async () => (await api.get("/smtp-accounts")).data,
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      dropshippingRecipientId: undefined,
      dropshippingSmtpId: undefined,
    },
  });

  // === POCZĄTEK OSTATECZNEJ POPRAWKI: Powrót do działającego setTimeout ===
  useEffect(() => {
    if (organization) {
      const orgData = organization as {
        dropshipping_recipient?: { id: string };
        dropshipping_smtp_account?: { id: string };
      };

      const recipientId = orgData.dropshipping_recipient?.id;
      const smtpId = orgData.dropshipping_smtp_account?.id;

      // Używamy setTimeout, aby dać komponentom <Select> czas na pełne zainicjowanie
      // zanim react-hook-form spróbuje programowo ustawić ich wartość.
      // To jest oryginalna, działająca metoda.
      setTimeout(() => {
        form.setValue("dropshippingRecipientId", recipientId);
        setTimeout(() => {
          form.setValue("dropshippingSmtpId", smtpId);
        }, 100);
      }, 100);
    }
  }, [organization, form]); // Zależność od `form` jest stabilna.
  // === KONIEC OSTATECZNEJ POPRAWKI ===

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      api.patch("/organization", values),
    onSuccess: () => {
      toast.success("Ustawienia zostały zapisane.");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err) || "Nie udało się zapisać ustawień.");
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    const payload = {
      dropshipping_recipient_id: data.dropshippingRecipientId || null,
      dropshipping_smtp_id: data.dropshippingSmtpId || null,
    };
    updateSettings(payload);
  };

  if (isLoadingOrg || isLoadingContacts || isLoadingSmtp) {
    return (
      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="pl-7 pt-4 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="rounded-2xl border border-border/15 bg-card/60 glass-dark p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-6 border-b border-border/10 pb-4">
        <Settings className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Ustawienia Wysyłki Dropshipping
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Skonfiguruj domyślnego odbiorcę (handlowca) i konto e-mail.
          </p>
        </div>
      </div>
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dropshippingRecipientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domyślny odbiorca zleceń</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? undefined : value)
                      }
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz kontakt..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Brak (nie wybrano)</SelectItem>
                        {contacts?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.email})
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
                name="dropshippingSmtpId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konto e-mail do wysyłki</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? undefined : value)
                      }
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz konto SMTP..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Brak (nie wybrano)</SelectItem>
                        {smtpAccounts?.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isPending || !form.formState.isDirty}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Zapisz zmiany
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

interface PurchaseOrderBatchDetails extends PurchaseOrderBatch {
  purchase_orders: PurchaseOrder[]; // Używamy snake_case
}

function BatchDetailsDialog({
  isOpen,
  onClose,
  batchId,
}: {
  isOpen: boolean;
  onClose: () => void;
  batchId: string | null;
}) {
  const {
    data: batchDetails,
    isLoading,
    isError,
  } = useQuery<PurchaseOrderBatchDetails>({
    // Załóżmy, że masz taki typ
    queryKey: ["batchDetails", batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const res = await api.get(`/purchase-order-batches/${batchId}`);
      return res.data;
    },
    enabled: !!batchId,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-card backdrop-blur-sm border">
        <DialogHeader>
          <DialogTitle>
            Szczegóły partii #{batchId?.replace("batch_", "").substring(0, 8)}
          </DialogTitle>
          <DialogDescription>
            Poniżej znajduje się lista wszystkich zleceń zawartych w tej partii.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-4 -mr-2">
          {isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          )}
          {isError && (
            <p className="text-destructive p-4">
              Błąd ładowania szczegółów partii.
            </p>
          )}
          {batchDetails && (
            <div className="space-y-4">
              {/* === POCZĄTEK POPRAWEK === */}
              {batchDetails.purchase_orders.map((po) => (
                <div
                  key={po.id}
                  className="text-sm p-3 border rounded-md bg-card/30"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">
                        Zamówienie:{" "}
                        <span className="font-mono">
                          {po.marketplaceExternalOrderId ||
                            po.marketplace_external_order_id ||
                            (po.marketplace_order_id ?? po.marketplaceOrderId)?.substring(0, 8) ||
                            po.id.substring(0, 8)}
                        </span>
                      </p>
                      <p>
                        Login kupującego:{" "}
                        <span className="font-medium">
                          {po.buyer_login || po.buyerLogin || "Brak"}
                        </span>
                      </p>
                      <p>
                        Kod adresu:{" "}
                        <span className="font-medium">
                          {po.supplier_address_code || "Brak"}
                        </span>
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 pl-4">
                      <p className="text-xs text-muted-foreground">
                        Wartość brutto
                      </p>
                      <p className="text-lg font-bold">
                        {po.marketplace_order?.total_to_pay ? `${po.marketplace_order.total_to_pay} PLN` : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-card/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      Pozycje:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      {(po.line_items || po.lineItems)?.map((item: any, index: number) => (
                        <li key={index}>
                          {item.name} (x{item.quantity}) - Indeks:{" "}
                          <span className="font-semibold">
                            {item.supplier_product_index || item.supplierProductIndex || "Brak"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
              {/* === KONIEC POPRAWEK === */}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const getStatusVariant = (
  status: PurchaseOrderBatchStatus
): "success" | "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "PROCESSING":
      return "default";
    case "DISPATCHING":
      return "secondary";
    case "FAILED":
    case "PARTIAL_FAILURE":
      return "destructive";
    default:
      return "outline";
  }
};

function HistoryTable() {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["purchaseOrderBatches", pagination],
    queryFn: async ({ queryKey }) => {
      const [, currentPageState] = queryKey as [string, PaginationState];
      const response = await api.get(
        `/purchase-order-batches?page=${currentPageState.pageIndex + 1}&size=${
          currentPageState.pageSize
        }`
      );
      return response.data as PaginatedResponse<PurchaseOrderBatch>;
    },
    placeholderData: keepPreviousData,
  });

  // Grupowanie po dniach
  const groupedByDay = useMemo(() => {
    const items = data?.items ?? [];
    const map = new Map<string, { batches: PurchaseOrderBatch[]; totalAmount: number; totalItems: number }>();

    items.forEach((batch) => {
      const day = format(new Date(batch.created_at), "yyyy-MM-dd");
      if (!map.has(day)) {
        map.set(day, { batches: [], totalAmount: 0, totalItems: 0 });
      }
      const group = map.get(day)!;
      group.batches.push(batch);
      group.totalAmount += batch.total_gross_amount ?? 0;
      group.totalItems += batch.item_count ?? 0;
    });

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  const formatPLN = (amount: number) =>
    amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });

  if (isError) {
    return (
      <div className="text-destructive flex items-center gap-2 p-4">
        <AlertCircle /> Błąd ładowania historii.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border/15 bg-card/60 glass-dark p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-6 border-b border-border/10 pb-4">
          <History className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Historia wysłanych partii
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Partie pogrupowane dziennie. Kliknij wiersz, aby zobaczyć szczegóły.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {isLoading && !data && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          )}
          {groupedByDay.map(([day, group]) => (
            <div key={day} className="rounded-xl border border-border/40 overflow-hidden bg-background/25">
              {/* Nagłówek dnia */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    {format(new Date(day), "d MMMM yyyy", { locale: pl })}
                  </span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {group.batches.length} {group.batches.length === 1 ? "partia" : "partii"}
                    {" · "}
                    {group.totalItems} zleceń
                  </Badge>
                </div>
                <span className="text-sm font-bold text-primary">
                  {formatPLN(group.totalAmount)}
                </span>
              </div>
              {/* Wiersze partii */}
              <div className="divide-y divide-border/20">
                {group.batches.map((batch) => (
                  <div
                    key={batch.id}
                    onClick={() => setSelectedBatchId(batch.id)}
                    className="flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        #{batch.id.replace("batch_", "").substring(0, 8)}
                      </span>
                      <Badge variant={getStatusVariant(batch.status)} className="text-xs">
                        {batch.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {batch.item_count} zleceń
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(batch.created_at), "HH:mm")}
                      </span>
                      <span className="font-medium tabular-nums">
                        {batch.total_gross_amount != null
                          ? formatPLN(batch.total_gross_amount)
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {groupedByDay.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Brak historii partii do wyświetlenia.
            </p>
          )}
        </div>
      </div>
      <BatchDetailsDialog
        isOpen={!!selectedBatchId}
        onClose={() => setSelectedBatchId(null)}
        batchId={selectedBatchId}
      />
    </>
  );
}


// --- Komponent Główny ---

export function HistoryAndSettings() {
  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="orders" className="w-full space-y-6">
        <TabsList className="border border-border bg-muted/40 p-1 rounded-2xl glass shadow-sm flex h-auto gap-1 self-start shrink-0">
          <TabsTrigger 
            value="orders" 
            className="rounded-xl gap-2 px-5 py-2 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Zarządzanie zleceniami
          </TabsTrigger>
          <TabsTrigger 
            value="batches" 
            className="rounded-xl gap-2 px-5 py-2 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
          >
            <History className="h-3.5 w-3.5" />
            Partie wysyłek
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="rounded-xl gap-2 px-5 py-2 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
          >
            <Settings className="h-3.5 w-3.5" />
            Ustawienia integracji
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-0 focus:outline-none">
          <DropshippingOrdersTab />
        </TabsContent>

        <TabsContent value="batches" className="mt-0 focus:outline-none">
          <HistoryTable />
        </TabsContent>

        <TabsContent value="settings" className="mt-0 focus:outline-none">
          <SettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
