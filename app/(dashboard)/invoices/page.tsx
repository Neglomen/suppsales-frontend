"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PaginationState,
  SortingState,
  RowSelectionState,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { pl } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "@/lib/api";
import { SupplierInvoice, ErpSyncStatus } from "@/types/invoice";
import { generateKsefPdfBase64 } from "@/lib/ksef-pdf";

import { KsefProductMappingModal } from "./_components/ksef-product-mapping-modal";
import { InvoicePreviewDialog } from "./_components/invoice-preview-dialog";
import {
  Eye,
  Download,
  RefreshCw,
  CheckSquare,
  FilePlus2,
  FileText,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Receipt,
  Building2,
  Calendar as CalendarIcon,
  Filter,
  Printer,
  Table as TableIcon,
  FileMinus2,
  FileCheck2,
  FileClock,
  StickyNote
} from "lucide-react";
import { usePrintHub } from "@/hooks/use-print-hub";
import { printHubService } from "@/lib/print-hub-service";
import { useMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Typy ────────────────────────────────────────────────────────────────────

interface PaginatedInvoicesResponse {
  total: number;
  page: number;
  size: number;
  pages: number;
  items: SupplierInvoice[];
}

interface InvoiceFilters {
  search?: string;
  source?: string;
  ksefCategory?: string;
  erpSyncStatus?: string;
}

// ─── Helpery ─────────────────────────────────────────────────────────────────

const ErpStatusBadge = ({ status, isProcessing }: { status: ErpSyncStatus; isProcessing?: boolean }) => {
  const config: Record<ErpSyncStatus, { label: string; className: string }> = {
    PENDING:   { label: "Oczekuje",    className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    SYNCED:    { label: "Zsync.",      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    ERROR:     { label: "Błąd",        className: "bg-red-500/10 text-red-500 border-red-500/20" },
    NOT_FOUND: { label: "Nie nal.",    className: "bg-muted text-muted-foreground border-border" },
  };
  const { label, className } = config[status] ?? { label: status, className: "bg-muted" };
  
  // Pulsujący spinner gdy task ERP jest w trakcie, a ta faktura czeka
  if (isProcessing && status === "PENDING") {
    return (
      <Badge variant="outline" className={cn("text-xs font-medium border gap-1.5 animate-pulse", "bg-blue-500/10 text-blue-500 border-blue-500/30")}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Przetwarzanie...
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border", className)}>
      {label}
    </Badge>
  );
};

const SourceBadge = ({ source }: { source: string | null }) => {
  if (!source) return null;
  const colors: Record<string, string> = {
    KSEF:        "bg-blue-500/10 text-blue-500 border-blue-500/20",
    AB:          "bg-purple-500/10 text-purple-500 border-purple-500/20",
    DEFAULT:     "bg-muted text-muted-foreground border-border",
  };
  const cls = colors[source] ?? colors.DEFAULT;
  return (
    <Badge variant="outline" className={cn("text-xs border", cls)}>
      {source}
    </Badge>
  );
};

// ─── Strona faktur ────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { isEnabled: printHubEnabled, status: printHubStatus, defaultInvoicePrinter } = usePrintHub();
  const isMobile = useMobile(768);
  
  const [activeTab, setActiveTab] = useState<"ksef" | "other">("ksef");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([{ id: "issue_date", desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [pollingTaskId, setPollingTaskId] = useState<string | null>(null);
  const [processingInvoiceIds, setProcessingInvoiceIds] = useState<Set<string>>(new Set());
  const [isKsefSyncing, setIsKsefSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Stan dla podglądu faktury (InvoicePreviewDialog)
  const [selectedPreviewInvoice, setSelectedPreviewInvoice] = useState<SupplierInvoice | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  // Stan dla modalu mapowania
  const [mappingModalState, setMappingModalState] = useState<{
    isOpen: boolean;
    missingProducts: { name: string; invoices: { id: string; num: string }[] }[];
    failedInvoices: { id: string; num: string }[];
  }>({
    isOpen: false,
    missingProducts: [],
    failedInvoices: [],
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput || undefined }));
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Pobieranie danych
  const { data, isLoading, isRefetching, isError } = useQuery<PaginatedInvoicesResponse>({
    queryKey: ["supplier-invoices", pagination, sorting, filters, activeTab, dateRange],
    queryFn: async () => {
      const params: Record<string, any> = {
        page: pagination.pageIndex + 1,
        size: pagination.pageSize,
        ...filters,
      };

      if (activeTab === "ksef") {
        params.source = "KSEF";
      } else {
        params.excludeSource = "KSEF";
      }

      if (dateRange?.from) {
        params.startDate = format(dateRange.from, "yyyy-MM-dd");
      }
      if (dateRange?.to) {
        params.endDate = format(dateRange.to, "yyyy-MM-dd");
      }

      if (sorting.length > 0) {
        params.sortBy = sorting[0].id;
        params.sortOrder = sorting[0].desc ? "desc" : "asc";
      }
      const res = await api.get("/supplier-invoices/", { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  // Mutacja zmiany szczegółów faktury (kategoria i notatki)
  const updateInvoiceDetailsMutation = useMutation({
    mutationFn: async ({ id, category, notes }: { id: string; category?: string; notes?: string }) => {
      const payload: any = {};
      if (category !== undefined) payload.ksef_category = category;
      if (notes !== undefined) payload.notes = notes;
      
      const res = await api.patch(`/supplier-invoices/${id}/details`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Zaktualizowano pomyślnie!");
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
    },
    onError: (err) => {
      toast.error(`Błąd: ${getErrorMessage(err)}`);
    }
  });

  // Polling statusu zadania — z live odświeżaniem tabeli
  useEffect(() => {
    if (!pollingTaskId) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get<{ status: string; message?: string, result?: any }>(`/tasks/${pollingTaskId}/status`);
        const { status, message, result } = res.data;
        if (status === "SUCCESS") {
          toast.success(message || "Zadanie zakończone pomyślnie.");
          setPollingTaskId(null);
          setProcessingInvoiceIds(new Set());
          queryClient.refetchQueries({ queryKey: ["supplier-invoices"] });
        } else if (status === "PARTIAL_FAILURE" || status === "FAILED" || status === "FAILURE") {
          setPollingTaskId(null);
          setProcessingInvoiceIds(new Set());
          
          let hasMissingProducts = false;
          let missingProductsMap = new Map<string, { name: string; invoices: { id: string; num: string }[] }>();
          let failedInvoicesMap = new Map<string, { id: string; num: string }>();
          
          const details = result?.summary?.details || result?.result?.details || result?.details;
          
          if (details) {
            details.forEach((d: any) => {
              if (d.status === "ERROR" && d.message) {
                 const match = d.message.match(/Nie znaleziono towarów w Subiekcie:\s*(.+)$/);
                 if (match) {
                    hasMissingProducts = true;
                    if (d.invoice_id) {
                      failedInvoicesMap.set(d.invoice_id, { id: d.invoice_id, num: d.invoice_number || "Nieznana" });
                    }
                    match[1].split(",").forEach((name: string) => {
                      const trimmedName = name.trim();
                      if (!missingProductsMap.has(trimmedName)) {
                        missingProductsMap.set(trimmedName, { name: trimmedName, invoices: [] });
                      }
                      const productInfo = missingProductsMap.get(trimmedName)!;
                      if (d.invoice_id && !productInfo.invoices.some(inv => inv.id === d.invoice_id)) {
                        productInfo.invoices.push({ id: d.invoice_id, num: d.invoice_number || "Nieznana" });
                      }
                    });
                 }
              }
            });
          }

          if (hasMissingProducts && missingProductsMap.size > 0 && failedInvoicesMap.size > 0) {
            toast("Wykryto brakujące mapowania towarów.", { icon: "⚠️" });
            setMappingModalState({
              isOpen: true,
              missingProducts: Array.from(missingProductsMap.values()),
              failedInvoices: Array.from(failedInvoicesMap.values()),
            });
          } else {
            if (status === "PARTIAL_FAILURE") {
              toast("Zadanie zakończone z częściowymi błędami.", { icon: "⚠️" });
            } else {
              toast.error(message || "Zadanie zakończone błędem.");
            }
          }
          queryClient.refetchQueries({ queryKey: ["supplier-invoices"] });
        } else if (status === "RUNNING") {
          // Odświeżaj tabelę na bieżąco — statusy ERP aktualizują się live
          queryClient.refetchQueries({ queryKey: ["supplier-invoices"] });
        }
      } catch {
        setPollingTaskId(null);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [pollingTaskId, queryClient]);

  // Definicja kolumn (uzależniona od tab-u)
  const columns = useMemo<ColumnDef<SupplierInvoice>[]>(() => {
    const baseCols: ColumnDef<SupplierInvoice>[] = [
      {
        id: "select",
        size: 40,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Zaznacz wszystkie"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Zaznacz wiersz"
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        accessorKey: "invoice_number",
        header: "Numer faktury",
        cell: ({ row }) => (
          <div className="min-w-[140px] pl-2 flex items-start gap-3">
            <div className="flex flex-col items-center gap-1.5 mt-0.5 shrink-0">
              {(() => {
                const rawType = row.original.invoice_type || "VAT";
                const type = rawType.toUpperCase();
                if (type === "KOR" || type.startsWith("KOR") || type === "KOREKTA") {
                  return (
                    <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shadow-sm">
                       <FileMinus2 className="h-5 w-5 text-destructive" />
                    </div>
                  );
                }
                if (type === "ZAL" || type.startsWith("ZAL")) {
                  return (
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-sm">
                       <FileClock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  );
                }
                return (
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-sm">
                     <FileCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                );
              })()}
              {(() => {
                const rawType = row.original.invoice_type || "VAT";
                const type = rawType.toUpperCase();
                if (type === "KOR" || type.startsWith("KOR") || type === "KOREKTA") {
                  return <Badge variant="destructive" className="h-[18px] text-[9px] px-1.5 py-0 uppercase font-bold tracking-wider leading-none shadow-sm mt-1">Korekta</Badge>;
                }
                if (type === "ZAL" || type.startsWith("ZAL")) {
                  return <Badge variant="secondary" className="h-[18px] text-[9px] px-1.5 py-0 uppercase font-bold tracking-wider leading-none bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30 shadow-sm mt-1">Zaliczka</Badge>;
                }
                if (type === "VAT" || type === "FAKTURA") {
                  return <Badge variant="outline" className="h-[18px] text-[9px] px-1.5 py-0 uppercase font-bold tracking-wider leading-none bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shadow-sm mt-1">Faktura</Badge>;
                }
                return <Badge variant="outline" className="h-[18px] text-[9px] px-1.5 py-0 uppercase font-bold tracking-wider leading-none shadow-sm mt-1">{rawType}</Badge>;
              })()}
            </div>
            <div className="pt-2 overflow-hidden">
              <p className="font-bold text-xs premium-gradient-text truncate max-w-[110px]" title={row.original.invoice_number}>{row.original.invoice_number}</p>
              {row.original.original_invoice_number && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[110px]" title={row.original.original_invoice_number}>
                  {row.original.original_invoice_number}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "seller_name",
        header: "Sprzedawca",
        cell: ({ row }) => (
          <div className="min-w-[140px] max-w-[170px] pr-4">
            <p className="text-sm font-bold truncate" title={row.original.seller_name || undefined}>{row.original.seller_name || "—"}</p>
            {row.original.seller_nip && (
              <p className="text-[11px] text-muted-foreground font-mono">NIP: {row.original.seller_nip}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "issue_date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1 hover:text-primary transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Data wystawienia
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          try {
            return (
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {format(new Date(row.original.issue_date), "dd MMMM yyyy", { locale: pl })}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                   Wystawiono
                </span>
              </div>
            );
          } catch {
            return <span className="text-sm">{row.original.issue_date}</span>;
          }
        },
      },
      {
        accessorKey: "total_gross_amount",
        header: () => <div className="text-right pr-6">Kwota brutto</div>,
        cell: ({ row }) => (
          <div className="text-right font-bold text-sm tabular-nums whitespace-nowrap pr-6">
            {row.original.total_gross_amount != null
              ? row.original.total_gross_amount.toLocaleString("pl-PL", {
                  style: "currency",
                  currency: row.original.currency || "PLN",
                })
              : "—"}
          </div>
        ),
      },
      {
        id: "source",
        header: () => <div className="text-center">Źródło</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
             <SourceBadge source={row.original.supplier_integration?.provider_type ?? null} />
          </div>
        ),
      },
      {
        accessorKey: "erp_sync_status",
        header: () => <div className="text-center">Status ERP</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <ErpStatusBadge status={row.original.erp_sync_status} isProcessing={processingInvoiceIds.has(row.original.id)} />
          </div>
        ),
      },
    ];

    if (activeTab === "ksef") {
      baseCols.splice(3, 0, {
        accessorKey: "recipient_name",
        header: "Odbiorca",
        cell: ({ row }) => (
          <div className="min-w-[130px] max-w-[170px] pr-4">
            <p className="text-sm font-medium truncate" title={row.original.recipient_name || undefined}>
              {row.original.recipient_name || "—"}
            </p>
          </div>
        ),
      });

      baseCols.push({
        accessorKey: "ksef_category",
        header: "Kategoria",
        cell: ({ row }) => {
          const [val, setVal] = useState(row.original.ksef_category || "");
          const [open, setOpen] = useState(false);
          const [search, setSearch] = useState("");

          // Funkcja mapująca kategorię na kolory i etykiety
          const getCategoryDisplay = (cat: string) => {
            if (!cat || cat === "NONE") return { label: "Brak", class: "text-muted-foreground", bg: "bg-transparent border-transparent" };
            if (cat === "PURCHASE") return { label: "Zakupowa", class: "text-emerald-500 font-semibold", bg: "bg-emerald-500/10 border-emerald-500/20" };
            if (cat === "COST") return { label: "Kosztowa", class: "text-amber-500 font-semibold", bg: "bg-amber-500/10 border-amber-500/20" };
            return { label: cat, class: "text-blue-600 dark:text-blue-400 font-semibold", bg: "bg-blue-500/10 border-blue-500/20" };
          };

          const handleSelect = (newVal: string) => {
            setVal(newVal);
            setOpen(false);
            setSearch("");
            if (newVal !== (row.original.ksef_category || "")) {
              updateInvoiceDetailsMutation.mutate({ id: row.original.id, category: newVal });
            }
          };

          const display = getCategoryDisplay(val);
          const cleanSearch = search.trim();

          return (
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 w-[115px] justify-start text-xs font-medium px-3 border hover:border-border transition-colors",
                      display.bg
                    )}
                  >
                    <span className={cn("truncate", display.class)}>{display.label}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Szukaj lub wpisz..." 
                      value={search}
                      onValueChange={setSearch}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && cleanSearch !== '') {
                          handleSelect(cleanSearch);
                        }
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {cleanSearch !== "" ? (
                          <div 
                            className="p-2 text-sm text-primary cursor-pointer hover:bg-muted"
                            onClick={() => handleSelect(cleanSearch)}
                          >
                            Utwórz "{cleanSearch}"
                          </div>
                        ) : "Brak wyników."}
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => handleSelect("PURCHASE")} className="text-emerald-500 font-semibold">Zakupowa</CommandItem>
                        <CommandItem onSelect={() => handleSelect("COST")} className="text-amber-500 font-semibold">Kosztowa</CommandItem>
                        <CommandItem onSelect={() => handleSelect("NONE")} className="text-muted-foreground">Brak</CommandItem>
                        {cleanSearch !== "" && cleanSearch.toUpperCase() !== "PURCHASE" && cleanSearch.toUpperCase() !== "COST" && cleanSearch.toUpperCase() !== "NONE" && (
                           <CommandItem onSelect={() => handleSelect(cleanSearch)} className="text-blue-600 font-semibold">
                             + Utwórz "{cleanSearch}"
                           </CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          );
        }
      });

      baseCols.push({
        id: "notes",
        header: () => <div className="text-center">Uwagi</div>,
        cell: ({ row }) => {
          const [notes, setNotes] = useState(row.original.notes || "");
          const [open, setOpen] = useState(false);

          // Synchronizuj stan lokalny gdy otrzymamy nowe dane z API
          useEffect(() => {
            setNotes(row.original.notes || "");
          }, [row.original.notes, open]);

          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("h-8 w-8 relative", row.original.notes ? "text-amber-500" : "text-muted-foreground")}>
                    <StickyNote className="h-4 w-4" />
                    {row.original.notes && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end" sideOffset={5}>
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm leading-none">Notatki dla {row.original.invoice_number}</h4>
                    <Textarea 
                      placeholder="Wpisz uwagi..." 
                      className="min-h-[100px] text-sm resize-none"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Anuluj</Button>
                      <Button 
                        size="sm" 
                        disabled={notes === (row.original.notes || "") || updateInvoiceDetailsMutation.isPending}
                        onClick={() => {
                          updateInvoiceDetailsMutation.mutate({ id: row.original.id, notes }, {
                            onSuccess: () => setOpen(false)
                          });
                        }}
                      >
                        {updateInvoiceDetailsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zapisz"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          );
        }
      });
    }

    baseCols.push({
      id: "actions",
      size: 50,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button onClick={(e) => e.stopPropagation()} variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover/row:opacity-100 transition-opacity">
              <span className="sr-only">Akcje</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Akcje</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handlePreviewPdf(row.original)}>
              <Eye className="mr-2 h-4 w-4" />
              Podgląd PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSingleDownload(row.original)}>
              <Download className="mr-2 h-4 w-4" />
              Pobierz PDF
            </DropdownMenuItem>
            {printHubEnabled && !isMobile && (
              <DropdownMenuItem onClick={() => handleSinglePrint(row.original)}>
                <Printer className="mr-2 h-4 w-4" />
                Drukuj (Print Hub)
              </DropdownMenuItem>
            )}
            {row.original.supplier_integration?.provider_type === "KSEF" && (
              <DropdownMenuItem onClick={() => handleViewXml(row.original)}>
                <FileText className="mr-2 h-4 w-4" />
                Podgląd XML
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });

    return baseCols;
  }, [activeTab, printHubEnabled, isMobile, updateInvoiceDetailsMutation.isPending, processingInvoiceIds]);

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    pageCount: data?.pages ?? -1,
    state: { pagination, sorting, rowSelection },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: true,
  });

  const selectedIds = table
    .getFilteredSelectedRowModel()
    .rows.map((r) => r.original.id);

  // ─── Akcje ───────────────────────────────────────────────────────────────

  const handleExportExcel = async () => {
    setIsExporting(true);
    const tid = toast.loading("Generowanie Excela...");
    try {
      const params: Record<string, any> = { ...filters };
      if (activeTab === "ksef") params.source = "KSEF";
      else params.excludeSource = "KSEF";

      if (dateRange?.from) params.startDate = format(dateRange.from, "yyyy-MM-dd");
      if (dateRange?.to) params.endDate = format(dateRange.to, "yyyy-MM-dd");
      if (sorting.length > 0) {
        params.sortBy = sorting[0].id;
        params.sortOrder = sorting[0].desc ? "desc" : "asc";
      }

      const res = await api.get("/supplier-invoices/export", { params, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `faktury_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Plik wyeksportowany!", { id: tid });
    } catch (err) {
      toast.error(`Błąd: ${getErrorMessage(err)}`, { id: tid });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSingleDownload = async (invoice: SupplierInvoice) => {
    const tid = toast.loading("Pobieranie pliku...");
    try {
      const res = await api.get(`/supplier-invoices/${invoice.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `faktura_${invoice.invoice_number.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Pobrano!", { id: tid });
    } catch (err) {
      toast.error(`Błąd: ${getErrorMessage(err)}`, { id: tid });
    }
  };

  const handlePreviewPdf = async (invoice: SupplierInvoice) => {
    const tid = toast.loading("Ładowanie podglądu dokumentu...");
    try {
      const isKsef = invoice.supplier_integration?.provider_type?.toUpperCase() === "KSEF";
      let base64data = "";

      if (isKsef) {
         const res = await api.get(`/supplier-invoices/${invoice.id}/ksef-xml`);
         const generated = await generateKsefPdfBase64(res.data);
         if (!generated) throw new Error("Nie udało się wygenerować wizualizacji KSeF do podglądu.");
         base64data = generated;
      } else {
         if (!invoice.file_path) {
           throw new Error("Brak pliku PDF dla tej faktury do podglądu.");
         }
         const res = await api.get(`/supplier-invoices/${invoice.id}/download`, { responseType: "blob" });
         base64data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(res.data);
         });
      }

      const binary = atob(base64data);
      const array = new Uint8Array(binary.length);
      for(let i=0; i<binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([array], {type: "application/pdf"});
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      toast.success("Otwarto podgląd", { id: tid });
    } catch (err) {
      toast.error(`Błąd podglądu: ${getErrorMessage(err)}`, { id: tid });
    }
  };

  const handleViewXml = (invoice: SupplierInvoice) => {
    setSelectedPreviewInvoice(invoice);
    setIsPreviewDialogOpen(true);
  };

  const handleMassiveDownload = async () => {
    if (!selectedIds.length) { toast.error("Zaznacz faktury."); return; }
    const tid = toast.loading(`Pobieranie ${selectedIds.length} faktur jako ZIP...`);
    try {
      const res = await api.post("/supplier-invoices/download-zip/", { invoice_ids: selectedIds }, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "faktury.zip"; a.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP pobrany!", { id: tid });
      table.resetRowSelection();
    } catch (err) {
      toast.error(`Błąd: ${getErrorMessage(err)}`, { id: tid });
    }
  };

  const handleSinglePrint = async (invoice: SupplierInvoice) => {
    if (printHubStatus !== "connected") {
      toast.error("Oczekuję na połączenie z Print Hub...");
      return;
    }
    const tid = toast.loading("Wysyłanie do Print Hub...");
    try {
      const isKsef = invoice.supplier_integration?.provider_type?.toUpperCase() === "KSEF";
      let base64data = "";

      if (isKsef) {
         const res = await api.get(`/supplier-invoices/${invoice.id}/ksef-xml`);
         const generated = await generateKsefPdfBase64(res.data);
         if (!generated) throw new Error("Nie udało się wygenerować wizualizacji KSeF do druku.");
         base64data = generated;
      } else {
         if (!invoice.file_path) {
           throw new Error("Brak pliku PDF dla tej faktury do druku.");
         }
         const res = await api.get(`/supplier-invoices/${invoice.id}/download`, { responseType: "blob" });
         base64data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(res.data);
         });
      }

      printHubService.printPdf(base64data, `FV_${invoice.invoice_number}`, { printerName: defaultInvoicePrinter || undefined });
      toast.success(`Wysłano dokument ${invoice.invoice_number} do druku`, { id: tid });
    } catch (err) {
      toast.error(`Błąd pobierania do wydruku: ${getErrorMessage(err)}`, { id: tid });
    }
  };

  const handleMassivePrint = async () => {
    if (!selectedIds.length) { toast.error("Zaznacz faktury."); return; }
    if (printHubStatus !== "connected") {
      toast.error("Otwórz wpierw aplikację Print Hub (Status: Odłączony).");
      return;
    }
    const tid = toast.loading(`Pobieranie ${selectedIds.length} faktur do druku...`);
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        const invoice = data?.items.find((i) => i.id === id);
        if (!invoice) continue;

        const isKsef = invoice.supplier_integration?.provider_type?.toUpperCase() === "KSEF";
        let base64data = "";

        try {
          if (isKsef) {
            const res = await api.get(`/supplier-invoices/${invoice.id}/ksef-xml`);
            const generated = await generateKsefPdfBase64(res.data);
            if (!generated) throw new Error("Błąd pliku KSeF");
            base64data = generated;
          } else {
            if (!invoice.file_path) {
              throw new Error(`Brak pliku PDF dla faktury ${invoice.invoice_number}`);
            }
            const res = await api.get(`/supplier-invoices/${invoice.id}/download`, { responseType: "blob" });
            base64data = await new Promise<string>((resolve) => {
               const reader = new FileReader();
               reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
               reader.readAsDataURL(res.data);
            });
          }
          
          printHubService.printPdf(base64data, `FV_${invoice.invoice_number}`, { printerName: defaultInvoicePrinter || undefined });
          successCount++;
        } catch (innerErr) {
          console.error(`Błąd przesyłania faktury ${invoice.invoice_number}:`, innerErr);
        }
      }
      toast.success(`Wysłano ${successCount} dokumentów z rzędu do bufora druku.`, { id: tid });
      table.resetRowSelection();
    } catch (err) {
      toast.error(`Błąd całkowity: ${getErrorMessage(err)}`, { id: tid });
    }
  };

  const handleCheckSubiekt = async () => {
    if (!selectedIds.length) { toast.error("Zaznacz faktury."); return; }
    const tid = toast.loading(`Sprawdzanie ${selectedIds.length} faktur w Subiekcie...`);
    try {
      const idsToProcess = [...selectedIds];
      const res = await api.post("/supplier-invoices/check-subiekt-status", { invoice_ids: selectedIds });
      toast.success(res.data.message || "Zlecono sprawdzenie!", { id: tid });
      if (res.data.task_id) {
        setPollingTaskId(res.data.task_id);
        setProcessingInvoiceIds(new Set(idsToProcess));
      }
      table.resetRowSelection();
    } catch (err) {
      toast.error(`Błąd: ${getErrorMessage(err)}`, { id: tid });
    }
  };

  const handleCreateSubiekt = async () => {
    if (!selectedIds.length) { toast.error("Zaznacz faktury."); return; }
    const tid = toast.loading(`Tworzenie ${selectedIds.length} faktur w Subiekcie...`);
    try {
      const idsToProcess = [...selectedIds];
      const res = await api.post("/supplier-invoices/create-in-subiekt", { invoice_ids: selectedIds });
      toast.success(res.data.message || "Zlecono tworzenie!", { id: tid });
      if (res.data.task_id) {
        setPollingTaskId(res.data.task_id);
        setProcessingInvoiceIds(new Set(idsToProcess));
      }
      table.resetRowSelection();
    } catch (err) {
      toast.error(`Błąd: ${getErrorMessage(err)}`, { id: tid });
    }
  };

  const handleCreateKsefInSubiekt = async (idsOverride?: string[] | React.MouseEvent) => {
    const idsToUse = Array.isArray(idsOverride) ? idsOverride : selectedIds;
    if (!idsToUse.length) { toast.error("Brak faktur do eksportu."); return; }
    const tid = toast.loading(`Eksport ${idsToUse.length} faktur KSeF do Subiekta...`);
    try {
      const res = await api.post("/supplier-invoices/create-ksef-in-subiekt", { invoice_ids: idsToUse });
      toast.success(res.data.message || "Zlecono eksport do Subiekta!", { id: tid });
      if (res.data.task_id) {
        setPollingTaskId(res.data.task_id);
        setProcessingInvoiceIds(new Set(idsToUse));
      }
      table.resetRowSelection();
    } catch (err) {
      toast.error(`Błąd: ${getErrorMessage(err)}`, { id: tid });
    }
  };

  const handleKsefSync = useCallback(async () => {
    setIsKsefSyncing(true);
    const tid = toast.loading("Pobieranie faktur z KSeF...");
    try {
      const intRes = await api.get("/service-integrations", { params: { category: "GOVERNMENT" } });
      const ksefIntegration = (intRes.data as any[]).find((i) => i.provider_type === "KSEF");
      if (!ksefIntegration) {
        toast.error("Brak aktywnej integracji z KSeF.", { id: tid });
        return;
      }
      const syncRes = await api.post("/ksef/sync", { integration_id: ksefIntegration.id });
      toast.success(syncRes.data?.message || "Synchronizacja zlecona!", { id: tid });
      if (syncRes.data?.task_id) setPollingTaskId(syncRes.data.task_id);
    } catch (err) {
      toast.error(`Błąd KSeF: ${getErrorMessage(err)}`, { id: tid });
    } finally {
      setIsKsefSyncing(false);
    }
  }, []);

  const hasFilters = !!(filters.search || filters.source || filters.ksefCategory || filters.erpSyncStatus);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Nagłówek i Zakładki */}
      <div className="px-6 pt-6 pb-2 flex-shrink-0 border-b border-border/40 bg-card/40">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-primary/10 shrink-0">
              <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Faktury Zakupowe</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                {data ? `${data.total.toLocaleString("pl-PL")} pozycj${data.total === 1 ? 'a' : 'i'} ` : "Ładowanie..."}
                (sortowane po dacie wystawienia)
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleKsefSync}
              disabled={isKsefSyncing}
              className="gap-2 border-dashed border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
            >
              <RefreshCw className={cn("h-4 w-4", isKsefSyncing && "animate-spin")} />
              Synch KSeF
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="gap-2 shadow-sm"
            >
              <TableIcon className={cn("h-4 w-4", isExporting && "animate-pulse")} />
              Eksportuj Excel
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setPagination(prev => ({ ...prev, pageIndex: 0 })); }} className="w-full">
          <TabsList className="bg-transparent border-b-0 space-x-2 p-0 h-auto">
            <TabsTrigger 
              value="ksef" 
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2"
            >
              Krajowy System e-Faktur
            </TabsTrigger>
            <TabsTrigger 
              value="other"
              className="data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-t-lg border-b-2 border-transparent data-[state=active]:border-muted-foreground px-4 py-2"
            >
              Pozostałe Źródła
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Toolbar z filtrami */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:flex-1 sm:max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Szukaj..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 bg-background focus-visible:ring-1 w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("h-9 border-dashed text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd LLL y", { locale: pl })} -{" "}
                        {format(dateRange.to, "dd LLL y", { locale: pl })}
                      </>
                    ) : (
                      format(dateRange.from, "dd LLL y", { locale: pl })
                    )
                  ) : (
                    <span>Wybierz datę</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {activeTab === "other" && (
              <Select
                value={filters.source ?? "ALL"}
                onValueChange={(v) => {
                  setFilters((prev) => ({ ...prev, source: v === "ALL" ? undefined : v }));
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              >
                <SelectTrigger className="w-[140px] h-9 outline-dashed outline-1 outline-border outline-offset-[-1px]">
                  <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Źródło" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Zewn. Źródła</SelectItem>
                  <SelectItem value="AB">Hurtownia AB</SelectItem>
                  <SelectItem value="ACTION">Action</SelectItem>
                </SelectContent>
              </Select>
            )}

            {activeTab === "ksef" && (
              <>
                <Select
                  value={filters.erpSyncStatus ?? "ALL"}
                  onValueChange={(v) => {
                    setFilters((prev) => ({ ...prev, erpSyncStatus: v === "ALL" ? undefined : v }));
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                >
                  <SelectTrigger className="w-[150px] h-9 border-dashed">
                    <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Status ERP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Status ERP: Wszystkie</SelectItem>
                    <SelectItem value="PENDING">Oczekuje</SelectItem>
                    <SelectItem value="SYNCED">Zsynchronizowano</SelectItem>
                    <SelectItem value="FAILED">Błąd</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.ksefCategory ?? "ALL"}
                  onValueChange={(v) => {
                    setFilters((prev) => ({ ...prev, ksefCategory: v === "ALL" ? undefined : v }));
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                >
                  <SelectTrigger className="w-[160px] h-9 border-dashed">
                    <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Kategoria KSeF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Kategoria: Wszystkie</SelectItem>
                    <SelectItem value="NONE">Brak</SelectItem>
                    <SelectItem value="PURCHASE">Zakupowa</SelectItem>
                    <SelectItem value="COST">Kosztowa</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {(hasFilters || dateRange) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({});
                setSearchInput("");
                setDateRange(undefined);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="h-9 px-3 text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 transition-colors ml-2"
            >
              <X className="h-3.5 w-3.5" />
              Resetuj
            </Button>
          )}

          {/* Akcje masowe */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 ml-auto p-1 pr-2 rounded-md bg-accent/40 border"
              >
                <div className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-sm ml-1">
                  {selectedIds.length}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="secondary" className="gap-2 shadow-sm h-7 text-xs font-semibold px-2">
                      Zarządzaj zaznaczonymi
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                      Wybrane faktury ({selectedIds.length})
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleMassiveDownload} className="py-2 focus:bg-primary/5">
                      <Download className="mr-2 h-4 w-4 text-primary" />
                      Pobierz archiwum ZIP
                    </DropdownMenuItem>
                    {printHubEnabled && !isMobile && (
                      <DropdownMenuItem onClick={handleMassivePrint} className="py-2 focus:bg-primary/5">
                        <Printer className="mr-2 h-4 w-4 text-primary" />
                        Drukuj sekwencyjnie
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {!isMobile && (
                      <>
                        <DropdownMenuItem onClick={handleCheckSubiekt} className="py-2">
                          <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                          Weryfikacja ERP
                        </DropdownMenuItem>
                        {activeTab === "ksef" ? (
                          <DropdownMenuItem onClick={handleCreateKsefInSubiekt} className="py-2 focus:bg-blue-50 focus:text-blue-700">
                            <FilePlus2 className="mr-2 h-4 w-4 text-blue-600" />
                            Eksportuj FZ z KSeF do Subiekta
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={handleCreateSubiekt} className="py-2 focus:bg-emerald-50 focus:text-emerald-700">
                            <FilePlus2 className="mr-2 h-4 w-4 text-emerald-600" />
                            Eksportuj do Subiekta
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-hidden px-2 sm:px-6 pb-6">
        <div className="h-full flex flex-col rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden relative">
          <div className="flex-1 overflow-auto smooth-scroll">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-md border-b border-border/40">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="h-10 px-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                        style={{ width: h.getSize() !== 150 ? h.getSize() : undefined }}
                      >
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                        <span className="text-sm">Parsowanie dokumentów...</span>
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={columns.length} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center p-8 text-destructive">
                         <div className="bg-destructive/10 p-3 rounded-full mb-3">
                           <X className="h-6 w-6" />
                         </div>
                         <h3 className="font-semibold text-lg">Wystąpił problem z siecią.</h3>
                         <p className="text-sm opacity-80 mt-1 max-w-sm mx-auto">Serwer nie odpowiada. Sprawdź swoje połączenie internetowe i odśwież stronę.</p>
                      </div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-[400px] text-center">
                      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto fade-in">
                        <div className="bg-primary/5 p-6 rounded-full mb-4 ring-1 ring-border/50">
                          <Receipt className="h-12 w-12 text-primary/30" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Pusty Rejestr</h3>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                          {hasFilters || dateRange 
                            ? "Nie znaleziono dokumentów dla wskazanych kryteriów i zakresu dat. Zmodyfikuj parametry wyszukiwania, aby kontynuować." 
                            : activeTab === "ksef" ? "Nie zsynchronizowano jeszcze dokumentów z repozytorium Ministerstwa Finansów." : "Brak zewnętrznych dokumentów API do przetworzenia."}
                        </p>
                        {(hasFilters || dateRange) && (
                          <Button variant="outline" onClick={() => { setFilters({}); setSearchInput(""); setDateRange(undefined); }}>
                            Wyczyść kryteria wyszukiwania
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => row.toggleSelected()}
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(
                        "group/row transition-all duration-200 relative cursor-pointer",
                        row.getIsSelected() ? "bg-primary/10 hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25" : "hover:bg-muted/60 dark:hover:bg-muted/50",
                        "border-b border-border/15 last:border-b-0",
                        isRefetching && "opacity-60 pointer-events-none"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginacja */}
          <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30 flex-shrink-0 backdrop-blur-sm shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Widok {table.getRowModel().rows.length} z {data?.total ?? 0} dokumentów</span>
              {(data?.pages ?? 0) > 1 && (
                <span className="font-semibold text-foreground bg-background px-2 py-0.5 rounded shadow-sm border text-xs">Strona {pagination.pageIndex + 1} / {data?.pages}</span>
              )}
            </div>
            
            {(data?.pages ?? 0) > 1 && (
               <div className="flex items-center gap-1.5 bg-background border rounded-lg p-1 shadow-sm">
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm hover:bg-muted" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                   <ChevronsLeft className="h-4 w-4" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm hover:bg-muted" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                   <ChevronLeft className="h-4 w-4" />
                 </Button>
                 <div className="w-px h-4 bg-border mx-1" />
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm hover:bg-muted" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                   <ChevronRight className="h-4 w-4" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm hover:bg-muted" onClick={() => table.setPageIndex((data?.pages ?? 1) - 1)} disabled={!table.getCanNextPage()}>
                   <ChevronsRight className="h-4 w-4" />
                 </Button>
               </div>
            )}
          </div>
        </div>
      </div>
      


      {/* Modal mapowania produktów */}
      <KsefProductMappingModal
        isOpen={mappingModalState.isOpen}
        onClose={() => setMappingModalState(prev => ({ ...prev, isOpen: false }))}
        missingProducts={mappingModalState.missingProducts}
        failedInvoices={mappingModalState.failedInvoices}
        onRetry={(ids) => {
          setMappingModalState(prev => ({ ...prev, isOpen: false }));
          handleCreateKsefInSubiekt(ids);
        }}
      />

      {/* Modal interaktywnego podglądu faktury */}
      <InvoicePreviewDialog
        isOpen={isPreviewDialogOpen}
        setIsOpen={setIsPreviewDialogOpen}
        invoice={selectedPreviewInvoice}
      />
    </div>
  );
}
