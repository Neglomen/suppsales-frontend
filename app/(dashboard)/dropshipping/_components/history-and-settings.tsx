"use client";

import { useMemo, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import {
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
import {
  Loader2,
  Save,
  AlertCircle,
  Settings,
  History,
  Box,
  Calendar,
  ChevronRight,
  ExternalLink,
  ShoppingBag,
  User,
  Building2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PurchaseOrder } from "@/types/purchase-order";

// --- Sekcja Ustawień ---

const settingsSchema = z.object({
  dropshippingRecipientId: z.string().optional(),
  dropshippingSmtpId: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsForm() {
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

  useEffect(() => {
    if (organization) {
      const orgData = organization as {
        dropshipping_recipient?: { id: string };
        dropshipping_smtp_account?: { id: string };
      };

      const recipientId = orgData.dropshipping_recipient?.id;
      const smtpId = orgData.dropshipping_smtp_account?.id;

      setTimeout(() => {
        form.setValue("dropshippingRecipientId", recipientId);
        setTimeout(() => {
          form.setValue("dropshippingSmtpId", smtpId);
        }, 100);
      }, 100);
    }
  }, [organization, form]);

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
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            Ustawienia Wysyłki Dropshipping
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Skonfiguruj domyślnego odbiorcę (handlowca) oraz konto e-mail do wysyłki roboczych zleceń.
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
                    <FormLabel className="text-xs font-semibold text-slate-200">Domyślny odbiorca zleceń</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? undefined : value)
                      }
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-slate-950/50 border-white/10 text-xs">
                          <SelectValue placeholder="Wybierz kontakt z książki..." />
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
                    <FormLabel className="text-xs font-semibold text-slate-200">Konto e-mail do wysyłki (SMTP)</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? undefined : value)
                      }
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-slate-950/50 border-white/10 text-xs">
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
            <div className="flex justify-end pt-3 border-t border-white/10">
              <Button
                type="submit"
                disabled={isPending || !form.formState.isDirty}
                className="bg-primary hover:scale-105 transition-transform"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Zapisz Ustawienia
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

interface PurchaseOrderBatchDetails extends PurchaseOrderBatch {
  purchase_orders: PurchaseOrder[];
}

const translateBatchStatus = (status: PurchaseOrderBatchStatus) => {
  switch (status) {
    case "COMPLETED":
      return { label: "Zrealizowano", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "PROCESSING":
      return { label: "W trakcie", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    case "DISPATCHING":
      return { label: "Wysyłanie...", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case "FAILED":
    case "PARTIAL_FAILURE":
      return { label: "Błąd wysyłki", color: "bg-red-500/10 text-red-400 border-red-500/20" };
    default:
      return { label: status, color: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
  }
};

export function BatchDetailsDialog({
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
      <DialogContent className="max-w-4xl bg-slate-900/95 border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl p-6 text-foreground">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2.5 text-primary">
                <Box className="h-5 w-5" /> Partia Zleceń #{batchId?.replace("batch_", "").substring(0, 8)}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Wykaz wszystkich zleceń hurtowych wysłanych w tej zbiorczej partii.
              </DialogDescription>
            </div>
            {batchDetails && (
              <Badge className={`${translateBatchStatus(batchDetails.status).color} font-bold text-xs uppercase py-1 px-3 border`}>
                {translateBatchStatus(batchDetails.status).label}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4 pt-2 scrollbar-thin">
          {isLoading && (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          )}
          {isError && (
            <Alert variant="destructive" className="rounded-xl border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Błąd ładowania</AlertTitle>
              <AlertDescription className="text-xs">Nie udało się pobrać szczegółów partii z serwera.</AlertDescription>
            </Alert>
          )}
          {batchDetails && (
            <div className="space-y-3">
              {batchDetails.purchase_orders?.map((po) => {
                const extId = po.marketplaceExternalOrderId || po.marketplace_external_order_id || (po.marketplace_order_id ?? po.marketplaceOrderId)?.substring(0, 8) || po.id.substring(0, 8);
                const orderId = po.marketplace_order_id || po.marketplaceOrderId || po.id;
                const buyerLogin = po.buyer_login || po.buyerLogin || "Brak loginu";
                const totalPay = po.marketplace_order?.total_to_pay || (po as any).marketplace_order?.totalToPay;
                const lineItems = po.line_items || po.lineItems || [];

                return (
                  <div
                    key={po.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-3 hover:border-white/15 transition-all shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                          <ShoppingBag className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-100 font-mono">
                              #{extId}
                            </span>
                            <a
                              href={`/orders/${orderId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                            >
                              <ExternalLink className="h-3 w-3" /> Szczegóły
                            </a>
                          </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <User className="h-3 w-3 text-primary" /> {buyerLogin}
                            </p>
                            {po.supplier_address_code && (
                              <p className="text-xs text-slate-300 flex items-center gap-1 mt-1 font-semibold">
                                <Building2 className="h-3.5 w-3.5 text-primary" /> Kod hurtowni: <span className="font-mono text-slate-100">{po.supplier_address_code}</span>
                              </p>
                            )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Wartość brutto:</span>
                        <span className="text-sm font-extrabold text-slate-100 font-mono">
                          {totalPay ? `${totalPay} PLN` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Zamówione pozycje:</span>
                      <div className="space-y-1">
                        {lineItems.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/50 p-2 rounded-lg border border-white/5">
                            <span className="font-medium text-slate-200 truncate max-w-[65%]">
                              • {item.name} <span className="text-primary font-bold">(x{item.quantity})</span>
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              Indeks hurtowni: <span className="text-slate-200 font-bold">{item.supplier_product_index || item.supplierProductIndex || "Brak"}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HistoryTable() {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [pagination] = useState<PaginationState>({
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

  const totalBatchesCount = data?.items?.length ?? 0;
  const totalOrdersCount = useMemo(() => {
    return data?.items?.reduce((acc, b) => acc + (b.item_count ?? 0), 0) ?? 0;
  }, [data]);
  const totalGrossSum = useMemo(() => {
    return data?.items?.reduce((acc, b) => acc + (b.total_gross_amount ?? 0), 0) ?? 0;
  }, [data]);

  const formatPLN = (amount: number) =>
    amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" });

  if (isError) {
    return (
      <Alert variant="destructive" className="rounded-2xl border-red-500/30">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Błąd ładowania</AlertTitle>
        <AlertDescription>Nie udało się pobrać historii partii wysyłek z serwera.</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                Historia Wysłanych Partii Zleceń
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Przeglądaj zbiorcze wysyłki do hurtowni pogrupowane po dniach. Kliknij partię, aby wyświetlić wykaz zamówień.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="px-3 py-1.5 border-white/10 bg-slate-950/40 text-xs font-semibold">
              Partie: <span className="text-primary font-bold ml-1">{totalBatchesCount}</span>
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 border-white/10 bg-slate-950/40 text-xs font-semibold">
              Zlecenia: <span className="text-emerald-400 font-bold ml-1">{totalOrdersCount}</span>
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 border-white/10 bg-slate-950/40 text-xs font-semibold">
              Suma: <span className="text-primary font-bold ml-1">{formatPLN(totalGrossSum)}</span>
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading && !data && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          )}

          {groupedByDay.map(([day, group]) => (
            <div key={day} className="rounded-2xl border border-white/10 overflow-hidden bg-slate-950/40 shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(day), "d MMMM yyyy", { locale: pl })}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 border-white/10 bg-white/5 text-slate-300">
                    {group.batches.length} {group.batches.length === 1 ? "partia" : "partii"} • {group.totalItems} zleceń
                  </Badge>
                </div>
                <span className="text-sm font-extrabold text-primary font-mono">
                  {formatPLN(group.totalAmount)}
                </span>
              </div>

              <div className="divide-y divide-white/5">
                {group.batches.map((batch) => {
                  const statusInfo = translateBatchStatus(batch.status);
                  return (
                    <div
                      key={batch.id}
                      onClick={() => setSelectedBatchId(batch.id)}
                      className="flex items-center justify-between px-4 py-3 text-xs sm:text-sm cursor-pointer hover:bg-primary/10 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-bold text-slate-300 group-hover:text-primary transition-colors">
                          #{batch.id.replace("batch_", "").substring(0, 8)}
                        </span>
                        <Badge className={`${statusInfo.color} font-bold text-[10px] uppercase py-0.5 px-2 border`}>
                          {statusInfo.label}
                        </Badge>
                        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                          {batch.item_count} zleceń
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs text-slate-400 font-mono">
                          {format(new Date(batch.created_at), "HH:mm")}
                        </span>
                        <span className="font-bold tabular-nums text-slate-100 font-mono">
                          {batch.total_gross_amount != null
                            ? formatPLN(batch.total_gross_amount)
                            : "—"}
                        </span>
                        <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold text-xs flex items-center gap-0.5">
                          Szczegóły <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {groupedByDay.length === 0 && !isLoading && (
            <div className="text-center py-12 space-y-3">
              <History className="h-12 w-12 text-slate-600 mx-auto opacity-30" />
              <p className="text-sm font-semibold text-slate-400">Brak zarejestrowanej historii partii wysyłek.</p>
            </div>
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
