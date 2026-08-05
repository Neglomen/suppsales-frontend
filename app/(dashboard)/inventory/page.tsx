"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Database,
  History,
  Send,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Filter,
  Wand2,
  Sliders,
  Link2
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { ProductDialog } from "./_components/product-dialog";
import { SyncLogsModal } from "./_components/sync-logs-modal";
import { LinkOfferDialog } from "./_components/link-offer-dialog";
import { ConfirmDeleteModal } from "./_components/confirm-delete-modal";
import { Trash2 } from "lucide-react";
import { AutoLinkWizardModal } from "./_components/auto-link-wizard-modal";
import { StockRuleModal } from "./_components/stock-rule-modal";

interface ChannelOffer {
  id: string;
  external_offer_id: string;
  service_integration_id: number;
  sync_status: string;
  sync_error: string | null;
  last_synced_at: string | null;
  sync_rule?: string;
  safety_buffer?: number;
  max_auction_quantity?: number;
  override_price?: number;
  sync_stock_enabled?: boolean;
  sync_price_enabled?: boolean;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  stock_quantity: number;
  base_price: number | null;
  is_active?: boolean;
  channel_offers: ChannelOffer[];
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isErpSyncing, setIsErpSyncing] = useState(false);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  // Quick Inline Edit State
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<string>("");
  const [isSavingStock, setIsSavingStock] = useState(false);

  // Quick Link Offer State per row
  const [quickLinkProductId, setQuickLinkProductId] = useState<string | null>(null);

  // Stock Rule Modal state
  const [selectedRuleOffer, setSelectedRuleOffer] = useState<{
    offer: ChannelOffer;
    productName: string;
  } | null>(null);

  // Sync Logs Modal state
  const [activeLogModalProduct, setActiveLogModalProduct] = useState<{
    id: string;
    name: string;
    sku: string;
  } | null>(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/inventory/");
      setProducts(res.data);
    } catch (error: any) {
      if (error?.code !== "ERR_CANCELED") {
        toast.error("Nie udało się pobrać listy produktów z magazynu.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await api.delete(`/inventory/${productToDelete.id}`);
      toast.success(`Produkt ${productToDelete.sku} został pomyślnie usunięty z magazynu.`);
      setProductToDelete(null);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Błąd podczas usuwania produktu.");
    }
  };

  const handleToggleProductActive = async (product: Product, newActive: boolean) => {
    try {
      toast.loading(newActive ? `Włączanie sync dla ${product.sku}...` : `Wyłączanie sync dla ${product.sku}...`, { id: "toggle-active" });
      await api.put(`/inventory/${product.id}`, { is_active: newActive });
      toast.success(newActive ? "Produkt aktywowany." : "Produkt wyłączony z synchronizacji.", { id: "toggle-active" });
      fetchProducts();
    } catch (err: any) {
      toast.error("Błąd podczas zmiany statusu aktywacji.", { id: "toggle-active" });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getProductStatus = (product: Product) => {
    if (!product.channel_offers || product.channel_offers.length === 0) {
      return "UNLINKED";
    }
    const hasError = product.channel_offers.some(
      (o) => o.sync_status === "FAILED" || (o.sync_error && o.sync_error.length > 0)
    );
    if (hasError) return "ERROR";

    const isSyncing = product.channel_offers.some((o) => o.sync_status === "IN_PROGRESS");
    if (isSyncing) return "SYNCING";

    return "OK";
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.channel_offers?.some((o) =>
          o.external_offer_id.toLowerCase().includes(searchQuery.toLowerCase())
        );

      if (!matchesSearch) return false;

      const pStatus = getProductStatus(product);
      if (statusFilter === "ALL") return true;
      if (statusFilter === "ERROR" && pStatus === "ERROR") return true;
      if (statusFilter === "OK" && pStatus === "OK") return true;
      if (statusFilter === "UNLINKED" && pStatus === "UNLINKED") return true;
      if (statusFilter === "SYNCING" && pStatus === "SYNCING") return true;

      return false;
    });
  }, [products, searchQuery, statusFilter]);

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    let totalLinkedOffers = 0;
    let errorCount = 0;
    let okCount = 0;
    let totalStock = 0;

    products.forEach((p) => {
      totalStock += p.stock_quantity || 0;
      totalLinkedOffers += p.channel_offers?.length || 0;
      const status = getProductStatus(p);
      if (status === "ERROR") errorCount++;
      if (status === "OK") okCount++;
    });

    return { totalProducts, totalLinkedOffers, errorCount, okCount, totalStock };
  }, [products]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleSingleSync = async (productId: string) => {
    try {
      toast.loading("Zlecanie synchronizacji...", { id: "single-sync" });
      await api.post(`/inventory/${productId}/sync`);
      toast.success("Synchronizacja została zlecona!", { id: "single-sync" });
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Błąd podczas zlecania synchronizacji.", {
        id: "single-sync",
      });
    }
  };

  const handleBulkSync = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkSyncing(true);
      toast.loading(`Wysyłanie stanów dla ${selectedIds.length} produktów...`, {
        id: "bulk-sync",
      });
      await api.post("/inventory/bulk-sync", { product_ids: selectedIds });
      toast.success(`Zlecono synchronizację dla ${selectedIds.length} produktów.`, {
        id: "bulk-sync",
      });
      setSelectedIds([]);
      fetchProducts();
    } catch (error: any) {
      toast.error("Wystąpił błąd przy masowej synchronizacji.", { id: "bulk-sync" });
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const handleErpSync = async (productIds?: string[]) => {
    try {
      setIsErpSyncing(true);
      toast.loading("Pobieranie stanów z ERP Subiekt GT...", { id: "erp-sync" });
      const payload = productIds && productIds.length > 0 ? { product_ids: productIds } : undefined;
      const res = await api.post("/inventory/sync-erp", payload);
      toast.success(res.data.message || "Pomyślnie zsynchronizowano z ERP Subiekt GT!", {
        id: "erp-sync",
      });
      fetchProducts();
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Nie udało się połączyć z agentem ERP Subiekt GT.";
      toast.error(msg, { id: "erp-sync" });
    } finally {
      setIsErpSyncing(false);
    }
  };

  const startStockEdit = (product: Product) => {
    setEditingStockId(product.id);
    setEditingStockValue(product.stock_quantity.toString());
  };

  const cancelStockEdit = () => {
    setEditingStockId(null);
    setEditingStockValue("");
  };

  const saveInlineStock = async (product: Product) => {
    const val = parseInt(editingStockValue, 10);
    if (isNaN(val) || val < 0) {
      toast.error("Podaj prawidłową nieujemną ilość.");
      return;
    }

    try {
      setIsSavingStock(true);
      await api.put(`/inventory/${product.id}`, {
        name: product.name,
        stock_quantity: val,
        base_price: product.base_price || 0,
      });
      toast.success(`Zaktualizowano stan dla SKU ${product.sku} -> ${val} szt.`);
      setEditingStockId(null);
      fetchProducts();
    } catch (error: any) {
      toast.error("Błąd podczas zapisywania nowej ilości.");
    } finally {
      setIsSavingStock(false);
    }
  };

  const getRuleBadgeLabel = (offer: ChannelOffer) => {
    if (offer.sync_rule === "BUFFER" && offer.safety_buffer) {
      return `Bufor -${offer.safety_buffer}`;
    }
    if (offer.sync_rule === "FIXED_CAP" && offer.max_auction_quantity) {
      return `Max ${offer.max_auction_quantity}`;
    }
    return "Lustro 1:1";
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Header Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-600">
            Zarządzanie Magazynem & Stany Aukcji
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Centralna kontrola stanów magazynowych, automatyczna synchronizacja z Allegro i Subiekt GT.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Magic 1-Click Auto-Linker Wizard Button */}
          <Button
            onClick={() => setIsWizardOpen(true)}
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white shadow-lg shadow-purple-500/20"
          >
            <Wand2 className="mr-2 h-4 w-4" /> Magiczny Kreator Powiązań
          </Button>

          <Button
            variant="outline"
            onClick={() => handleErpSync()}
            disabled={isErpSyncing}
            className="border-primary/30 hover:bg-primary/5 transition-all"
          >
            <Database className={`mr-2 h-4 w-4 text-primary ${isErpSyncing ? "animate-spin" : ""}`} />
            Pobierz z ERP
          </Button>

          <Button
            onClick={() => setIsDialogOpen(true)}
            variant="secondary"
          >
            <Plus className="mr-2 h-4 w-4" /> Dodaj produkt
          </Button>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-border/40 shadow-sm relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Produkty Centralne
            </CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Łączny stan: <span className="font-semibold text-foreground">{metrics.totalStock} szt.</span>
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border/40 shadow-sm relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Powiązane Aukcje
            </CardTitle>
            <ExternalLink className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLinkedOffers}</div>
            <p className="text-xs text-muted-foreground mt-1">Aktywne kanały sprzedaży</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/40 shadow-sm relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              W Pełni Zsynchronizowane
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{metrics.okCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Stany zgodne z aukcjami</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/40 shadow-sm relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Wymagające Uwagi
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${metrics.errorCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.errorCount > 0 ? "text-destructive" : "text-foreground"}`}>
              {metrics.errorCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Błędy komend na aukcjach</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/40 shadow-xl glass">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Lista Towarów Magazynowych</CardTitle>
              <CardDescription>
                Utrzymuj właściwą dostępność na Allegro. Ustawiaj proste reguły 1-kliknięciem.
              </CardDescription>
            </div>

            {/* Filter and Search controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po SKU, nazwie, ID aukcji..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-background/50 border-border/50 text-sm"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-background/50 border-border/50 text-sm">
                  <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filtruj status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Wszystkie statusy</SelectItem>
                  <SelectItem value="OK">Zsynchronizowane (OK)</SelectItem>
                  <SelectItem value="ERROR">Z błędem</SelectItem>
                  <SelectItem value="UNLINKED">Brak podpiętych aukcji</SelectItem>
                  <SelectItem value="SYNCING">W trakcie synchronizacji</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={fetchProducts}
                disabled={isLoading}
                title="Odśwież dane"
                className="bg-background/50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedIds.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Zaznaczono <span className="font-bold text-primary">{selectedIds.length}</span> produktów
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleBulkSync}
                  disabled={isBulkSyncing}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="mr-2 h-3.5 w-3.5" />
                  Wyślij stany na Allegro
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleErpSync(selectedIds)}
                  disabled={isErpSyncing}
                  className="bg-background"
                >
                  <Database className="mr-2 h-3.5 w-3.5 text-primary" />
                  Pobierz z ERP dla zaznaczonych
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds([])}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Anuluj
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <Table containerClassName="overflow-x-hidden">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[36px] pl-3">
                  <Checkbox
                    checked={
                      filteredProducts.length > 0 &&
                      selectedIds.length === filteredProducts.length
                    }
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead className="w-[14%]">SKU / Symbol ERP</TableHead>
                <TableHead className="w-[26%]">Nazwa produktu</TableHead>
                <TableHead className="w-[12%]">Dostępny Stan</TableHead>
                <TableHead className="w-[10%]">Cena Bazowa</TableHead>
                <TableHead className="w-[20%]">Powiązane Aukcje & Reguła</TableHead>
                <TableHead className="w-[12%]">Status & Sync</TableHead>
                <TableHead className="text-right pr-3 w-[110px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Ładowanie magazynu...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                    Brak produktów spełniających kryteria wyszukiwania.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  const pStatus = getProductStatus(product);
                  const isEditingThis = editingStockId === product.id;
                  const isActive = product.is_active !== false;

                  const firstErrorOffer = product.channel_offers?.find(
                    (o) => o.sync_status === "FAILED" || (o.sync_error && o.sync_error.length > 0)
                  );

                  return (
                    <TableRow
                      key={product.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        isSelected ? "bg-primary/5" : ""
                      } ${!isActive ? "opacity-75 bg-amber-500/[0.02]" : ""}`}
                    >
                      {/* Checkbox */}
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectOne(product.id, !!checked)
                          }
                        />
                      </TableCell>

                      {/* SKU */}
                      <TableCell className="font-mono text-xs font-semibold">
                        <div className="flex flex-col gap-1">
                          <code className="bg-muted px-2 py-0.5 rounded border text-foreground w-fit font-bold">
                            {product.sku}
                          </code>
                        </div>
                      </TableCell>

                      {/* Name */}
                      <TableCell className="font-medium text-sm">
                        <Link
                          href={`/inventory/${product.id}`}
                          className="hover:underline hover:text-primary transition-colors line-clamp-1 flex items-center gap-1.5"
                        >
                          {!isActive && (
                            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Produkt wyłączony z synchronizacji" />
                          )}
                          <span>{product.name}</span>
                        </Link>
                      </TableCell>

                      {/* Stock Quantity (Inline Edit) */}
                      <TableCell>
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              value={editingStockValue}
                              onChange={(e) => setEditingStockValue(e.target.value)}
                              className="w-20 h-8 text-xs font-mono"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveInlineStock(product);
                                if (e.key === "Escape") cancelStockEdit();
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => saveInlineStock(product)}
                              disabled={isSavingStock}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={cancelStockEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            onClick={() => startStockEdit(product)}
                            className="group flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-lg border bg-card hover:bg-muted/60 transition-all w-fit shadow-2xs"
                            title="Kliknij, aby edytować stan"
                          >
                            <span className="font-bold text-sm font-mono text-primary">
                              {product.stock_quantity}
                            </span>
                            <span className="text-xs text-muted-foreground">szt.</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Base Price */}
                      <TableCell className="text-sm font-mono font-semibold">
                        {product.base_price ? `${product.base_price.toFixed(2)} PLN` : "-"}
                      </TableCell>

                      {/* Channel Offers & Stock Rules */}
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          {product.channel_offers && product.channel_offers.length > 0 ? (
                            product.channel_offers.map((offer) => (
                              <div key={offer.id} className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono bg-background border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold"
                                >
                                  Allegro: {offer.external_offer_id}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  onClick={() =>
                                    setSelectedRuleOffer({
                                      offer,
                                      productName: product.name,
                                    })
                                  }
                                  className="text-[10px] cursor-pointer hover:bg-muted font-sans border gap-1 text-primary bg-primary/5 px-1.5 py-0"
                                  title="Kliknij, aby zmienić regułę pilnowania stanu"
                                >
                                  <Sliders className="h-2.5 w-2.5" />
                                  {getRuleBadgeLabel(offer)}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setQuickLinkProductId(product.id)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground justify-start"
                            >
                              <Link2 className="h-3.5 w-3.5 mr-1 text-primary" /> + Podepnij aukcję
                            </Button>
                          )}
                        </div>
                      </TableCell>

                      {/* Sync Status & Active Switch */}
                      <TableCell>
                        <div className="flex flex-col gap-1.5 items-start">
                          {/* Active Switch Toggle */}
                          <div className="flex items-center gap-1.5">
                            <Switch
                              id={`active-switch-${product.id}`}
                              checked={isActive}
                              onCheckedChange={(val) => handleToggleProductActive(product, val)}
                              className="scale-75 origin-left"
                            />
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {isActive ? "WŁ" : "WYŁ"}
                            </span>
                          </div>

                          <TooltipProvider>
                            {!isActive ? (
                              <Badge variant="outline" className="border-slate-500/30 text-slate-500 bg-slate-500/10 text-[10px] py-0">
                                ⚪ Wyłączony
                              </Badge>
                            ) : pStatus === "OK" ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 gap-1 text-[10px] py-0"
                              >
                                <CheckCircle2 className="h-3 w-3" /> OK
                              </Badge>
                            ) : pStatus === "UNLINKED" ? (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground py-0">
                                Brak aukcji
                              </Badge>
                            ) : pStatus === "SYNCING" ? (
                              <Badge
                                variant="outline"
                                className="border-amber-500/30 text-amber-500 bg-amber-500/10 gap-1 animate-pulse text-[10px] py-0"
                              >
                                <RefreshCw className="h-3 w-3 animate-spin" /> W trakcie...
                              </Badge>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="destructive"
                                    className="gap-1 cursor-pointer hover:opacity-90 shadow-sm text-[10px] py-0"
                                    onClick={() =>
                                      setActiveLogModalProduct({
                                        id: product.id,
                                        name: product.name,
                                        sku: product.sku,
                                      })
                                    }
                                  >
                                    <AlertCircle className="h-3 w-3" /> Błąd
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3 bg-destructive text-destructive-foreground">
                                  <p className="font-bold text-xs mb-1">Komunikat błędu z Allegro:</p>
                                  <p className="text-xs font-mono break-words">
                                    {firstErrorOffer?.sync_error || "Błąd podczas wywoływania komendy na Allegro."}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSingleSync(product.id)}
                                  className="h-8 w-8 text-primary hover:bg-primary/10"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Wyślij stan na aukcje</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setActiveLogModalProduct({
                                      id: product.id,
                                      name: product.name,
                                      sku: product.sku,
                                    })
                                  }
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Dziennik zdarzeń</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <Link href={`/inventory/${product.id}`}>
                            <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                              Zarządzaj
                            </Button>
                          </Link>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setProductToDelete(product)}
                                  className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Usuń cały produkt z magazynu</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Product Creation Dialog */}
      <ProductDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchProducts}
      />

      {/* Quick Link Offer Dialog */}
      <LinkOfferDialog
        productId={quickLinkProductId || ""}
        open={!!quickLinkProductId}
        onOpenChange={(open) => {
          if (!open) setQuickLinkProductId(null);
        }}
        onSuccess={fetchProducts}
      />

      {/* Auto Linker Wizard Modal */}
      <AutoLinkWizardModal
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={fetchProducts}
      />

      {/* Stock Rule Modal */}
      <StockRuleModal
        open={!!selectedRuleOffer}
        onOpenChange={(open) => {
          if (!open) setSelectedRuleOffer(null);
        }}
        offer={selectedRuleOffer?.offer || null}
        productName={selectedRuleOffer?.productName}
        onSuccess={fetchProducts}
      />

      {/* Sync Logs Modal */}
      <SyncLogsModal
        open={!!activeLogModalProduct}
        onOpenChange={(open) => {
          if (!open) setActiveLogModalProduct(null);
        }}
        productId={activeLogModalProduct?.id || null}
        productName={activeLogModalProduct?.name}
        sku={activeLogModalProduct?.sku}
      />

      {/* Safety Confirmation Modal: Delete Entire Product */}
      <ConfirmDeleteModal
        title="Czy na pewno chcesz usunąć ten produkt z magazynu?"
        description={`Usunięcie produktu zniknie go bezpowrotnie z bazy SuppSales wraz ze wszystkimi (${productToDelete?.channel_offers?.length || 0}) powiązanymi aukcjami oraz całą historią zdarzeń.`}
        itemName={productToDelete?.name}
        itemSku={productToDelete?.sku}
        requireTypedConfirmation={true}
        confirmationText="USUŃ"
        open={!!productToDelete}
        onOpenChange={(open) => {
          if (!open) setProductToDelete(null);
        }}
        onConfirm={handleConfirmDeleteProduct}
      />
    </div>
  );
}
