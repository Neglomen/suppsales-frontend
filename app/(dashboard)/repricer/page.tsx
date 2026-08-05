"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import toast from "react-hot-toast";
import { RefreshCw, Search, Settings, ShieldAlert, TrendingDown, ExternalLink, Check, X, Play, Plus, Image as ImageIcon } from "lucide-react";

interface ChannelOffer {
  id: string;
  product_id: string;
  product_name?: string;
  external_offer_id: string;
  channel_sku?: string;
  override_price?: number;
  is_repricing_enabled: boolean;
  repricing_mode: "AUTO" | "ALERT";
  min_price?: number;
  max_price?: number;
  repricing_step_type: "AMOUNT" | "PERCENT";
  repricing_step_value: number;
  enable_price_increase: boolean;
  check_interval_minutes: number;
  alert_email?: string;
  ean_code?: string;
  excluded_offer_ids?: string;
  included_offer_ids?: string;
  last_repriced_at?: string;
}

interface CompetitorItem {
  offer_id: string;
  title: string;
  price: number;
  seller_id: string;
  seller_login: string;
  url: string;
  image_url?: string;
  is_own: boolean;
  is_excluded: boolean;
  is_included: boolean;
  active_in_comparison: boolean;
}

interface RepricerAlertItem {
  id: string;
  channel_offer_id: string;
  external_offer_id: string;
  ean_code?: string;
  current_price: number;
  competitor_lowest_price: number;
  suggested_price: number;
  min_price?: number;
  competitor_seller_name?: string;
  competitor_offer_url?: string;
  status: string;
  created_at: string;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  base_price?: number;
  channel_offers?: Array<{
    id: string;
    service_integration_id: number;
    external_offer_id: string;
    ean_code?: string;
    override_price?: number;
    min_price?: number;
    is_repricing_enabled?: boolean;
  }>;
}

interface IntegrationItem {
  id: number;
  name: string;
  provider_type: string;
}

interface AuctionSelectOption {
  key: string;
  label: string;
  product_id: string;
  service_integration_id: number;
  external_offer_id: string;
  ean_code: string;
  min_price: string;
  existing_offer_id?: string;
  is_new_for_product?: boolean;
}

export default function RepricerPage() {
  const [offers, setOffers] = useState<ChannelOffer[]>([]);
  const [alerts, setAlerts] = useState<RepricerAlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [selectedOffer, setSelectedOffer] = useState<ChannelOffer | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  const [competitorsModalOpen, setCompetitorsModalOpen] = useState<boolean>(false);
  const [competitorsData, setCompetitorsData] = useState<CompetitorItem[]>([]);
  const [competitorsLoading, setCompetitorsLoading] = useState<boolean>(false);

  // Add offer state
  const [isAddOfferOpen, setIsAddOfferOpen] = useState<boolean>(false);
  const [auctionOptions, setAuctionOptions] = useState<AuctionSelectOption[]>([]);
  const [integrationsList, setIntegrationsList] = useState<IntegrationItem[]>([]);
  const [selectedAuctionKey, setSelectedAuctionKey] = useState<string>("");

  const [addForm, setAddForm] = useState({
    existing_offer_id: "",
    product_id: "",
    service_integration_id: "",
    external_offer_id: "",
    ean_code: "",
    min_price: "",
    repricing_mode: "ALERT" as "AUTO" | "ALERT",
    is_manual_external_id: false,
  });

  // Form config state
  const [configForm, setConfigForm] = useState({
    is_repricing_enabled: false,
    repricing_mode: "ALERT" as "AUTO" | "ALERT",
    min_price: "",
    max_price: "",
    repricing_step_type: "AMOUNT" as "AMOUNT" | "PERCENT",
    repricing_step_value: "0.01",
    enable_price_increase: false,
    check_interval_minutes: "60",
    alert_email: "",
    ean_code: "",
  });

  const fetchOffers = async () => {
    try {
      const res = await api.get<ChannelOffer[]>("/repricer/offers");
      setOffers(res.data);
    } catch (err: any) {
      toast.error("Błąd podczas pobierania ofert dla automatu cenowego.");
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get<RepricerAlertItem[]>("/repricer/alerts?status_filter=PENDING");
      setAlerts(res.data);
    } catch (err: any) {
      toast.error("Błąd pobierania alertów cenowych.");
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchOffers(), fetchAlerts()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddOfferModal = async () => {
    setIsAddOfferOpen(true);
    setSelectedAuctionKey("");
    setAddForm({
      existing_offer_id: "",
      product_id: "",
      service_integration_id: "",
      external_offer_id: "",
      ean_code: "",
      min_price: "",
      repricing_mode: "ALERT",
      is_manual_external_id: false,
    });

    try {
      const [resProd, resInt] = await Promise.all([
        api.get<ProductItem[]>("/inventory/"),
        api.get<IntegrationItem[]>("/service-integrations"),
      ]);
      const products = resProd.data || [];
      const allegroIntegrations = (resInt.data || []).filter((i) => i.provider_type === "ALLEGRO");
      setIntegrationsList(allegroIntegrations);
      const defaultIntId = allegroIntegrations.length > 0 ? allegroIntegrations[0].id : 0;

      const options: AuctionSelectOption[] = [];

      products.forEach((p) => {
        const allegroOffers = (p.channel_offers || []).filter((co) =>
          allegroIntegrations.some((ai) => ai.id === co.service_integration_id)
        );

        if (allegroOffers.length > 0) {
          allegroOffers.forEach((co) => {
            options.push({
              key: `offer_${co.id}`,
              label: `[Aukcja Allegro: ${co.external_offer_id}] ${p.name} (EAN: ${co.ean_code || p.sku})`,
              product_id: p.id,
              service_integration_id: co.service_integration_id,
              external_offer_id: co.external_offer_id,
              ean_code: co.ean_code || p.sku || "",
              min_price: co.min_price ? String(co.min_price) : (p.base_price ? String(p.base_price) : ""),
              existing_offer_id: co.id,
            });
          });
        }

        // Dodajemy opcję powiązania nowej aukcji dla tego produktu
        options.push({
          key: `new_prod_${p.id}`,
          label: `[+ Dodaj nową aukcję dla]: ${p.name} (EAN/SKU: ${p.sku})`,
          product_id: p.id,
          service_integration_id: defaultIntId,
          external_offer_id: "",
          ean_code: p.sku || "",
          min_price: p.base_price ? String(p.base_price) : "",
          is_new_for_product: true,
        });
      });

      setAuctionOptions(options);

      if (options.length > 0) {
        handleSelectAuctionOption(options[0].key, options, allegroIntegrations);
      }
    } catch (err: any) {
      toast.error("Błąd pobierania listy produktów lub integracji Allegro.");
    }
  };

  const fetchAllegroEan = async (integrationId: string | number, offerId: string) => {
    if (!integrationId || !offerId) return;
    try {
      const res = await api.get<{ ean?: string; title?: string }>(
        `/repricer/allegro-offer-info?integration_id=${integrationId}&offer_id=${offerId}`
      );
      if (res.data && res.data.ean) {
        setAddForm((prev) => ({ ...prev, ean_code: res.data.ean || prev.ean_code }));
        toast.success(`Pobrano prawdziwy kod EAN z Allegro: ${res.data.ean}`);
      }
    } catch (e) {
      // Opcjonalny cichy błąd jeśli aukcja nie ma GTIN w parametrach Allegro
    }
  };

  const handleSelectAuctionOption = (
    key: string,
    opts: AuctionSelectOption[] = auctionOptions,
    integrations: IntegrationItem[] = integrationsList
  ) => {
    setSelectedAuctionKey(key);
    const selected = opts.find((o) => o.key === key);
    if (!selected) return;

    const defaultIntId = selected.service_integration_id || (integrations.length > 0 ? integrations[0].id : 0);

    setAddForm({
      existing_offer_id: selected.existing_offer_id || "",
      product_id: selected.product_id,
      service_integration_id: String(defaultIntId),
      external_offer_id: selected.external_offer_id,
      ean_code: selected.ean_code,
      min_price: selected.min_price,
      repricing_mode: "ALERT",
      is_manual_external_id: !!selected.is_new_for_product,
    });

    if (selected.external_offer_id && defaultIntId) {
      fetchAllegroEan(defaultIntId, selected.external_offer_id);
    }
  };

  const submitAddOffer = async () => {
    if (!addForm.product_id || !addForm.service_integration_id || !addForm.external_offer_id) {
      toast.error("Wybierz aukcję lub podaj wymagany numer ID aukcji Allegro.");
      return;
    }

    try {
      if (addForm.existing_offer_id) {
        // Aktualizacja istniejącej oferty w bazie - włączenie repricera
        await api.put(`/repricer/offers/${addForm.existing_offer_id}`, {
          is_repricing_enabled: true,
          ean_code: addForm.ean_code.trim() || null,
          min_price: addForm.min_price ? parseFloat(addForm.min_price) : null,
          repricing_mode: addForm.repricing_mode,
        });
        toast.success("Włączono automat cenowy dla wybranej aukcji Allegro!");
      } else {
        // Tworzenie nowego wpisu ChannelOffer
        await api.post("/repricer/offers", {
          product_id: addForm.product_id,
          service_integration_id: parseInt(addForm.service_integration_id, 10),
          external_offer_id: addForm.external_offer_id.trim(),
          ean_code: addForm.ean_code.trim() || null,
          min_price: addForm.min_price ? parseFloat(addForm.min_price) : null,
          repricing_mode: addForm.repricing_mode,
          is_repricing_enabled: true,
        });
        toast.success("Dodano nową ofertę Allegro do automatu cenowego!");
      }
      setIsAddOfferOpen(false);
      fetchOffers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Nie udało się włączyć automatu cenowego.");
    }
  };

  const handleToggleRepricing = async (offer: ChannelOffer, enabled: boolean) => {
    try {
      await api.put(`/repricer/offers/${offer.id}`, {
        is_repricing_enabled: enabled,
      });
      toast.success(enabled ? "Włączono automat cenowy." : "Wyłączono automat cenowy.");
      fetchOffers();
    } catch (err: any) {
      toast.error("Błąd aktualizacji statusu automatu.");
    }
  };

  const openConfig = (offer: ChannelOffer) => {
    setSelectedOffer(offer);
    setConfigForm({
      is_repricing_enabled: offer.is_repricing_enabled || false,
      repricing_mode: offer.repricing_mode || "ALERT",
      min_price: offer.min_price ? String(offer.min_price) : "",
      max_price: offer.max_price ? String(offer.max_price) : "",
      repricing_step_type: offer.repricing_step_type || "AMOUNT",
      repricing_step_value: offer.repricing_step_value ? String(offer.repricing_step_value) : "0.01",
      enable_price_increase: offer.enable_price_increase || false,
      check_interval_minutes: offer.check_interval_minutes ? String(offer.check_interval_minutes) : "60",
      alert_email: offer.alert_email || "",
      ean_code: offer.ean_code || "",
    });
    setIsConfigOpen(true);
  };

  const saveConfig = async () => {
    if (!selectedOffer) return;
    try {
      await api.put(`/repricer/offers/${selectedOffer.id}`, {
        is_repricing_enabled: configForm.is_repricing_enabled,
        repricing_mode: configForm.repricing_mode,
        min_price: configForm.min_price ? parseFloat(configForm.min_price) : null,
        max_price: configForm.max_price ? parseFloat(configForm.max_price) : null,
        repricing_step_type: configForm.repricing_step_type,
        repricing_step_value: parseFloat(configForm.repricing_step_value || "0.01"),
        enable_price_increase: configForm.enable_price_increase,
        check_interval_minutes: parseInt(configForm.check_interval_minutes || "60", 10),
        alert_email: configForm.alert_email || null,
        ean_code: configForm.ean_code || null,
      });
      toast.success("Konfiguracja automatu cenowego została zapisana.");
      setIsConfigOpen(false);
      fetchOffers();
    } catch (err: any) {
      toast.error("Nie udało się zapisać konfiguracji.");
    }
  };

  const openCompetitors = async (offer: ChannelOffer) => {
    setSelectedOffer(offer);
    setCompetitorsModalOpen(true);
    setCompetitorsLoading(true);
    try {
      const res = await api.get<{ competitors: CompetitorItem[] }>(`/repricer/offers/${offer.id}/competitors`);
      setCompetitorsData(res.data.competitors || []);
    } catch (err: any) {
      toast.error("Błąd podczas pobierania ofert z Allegro.");
      setCompetitorsData([]);
    } finally {
      setCompetitorsLoading(false);
    }
  };

  const toggleCompetitorInclusion = async (comp: CompetitorItem) => {
    if (!selectedOffer) return;
    let excludedList: string[] = [];
    let includedList: string[] = [];

    try {
      if (selectedOffer.excluded_offer_ids) excludedList = JSON.parse(selectedOffer.excluded_offer_ids);
      if (selectedOffer.included_offer_ids) includedList = JSON.parse(selectedOffer.included_offer_ids);
    } catch (e) {}

    const offerIdStr = String(comp.offer_id);

    if (comp.active_in_comparison) {
      // Wyłączamy z porównywania
      if (!excludedList.includes(offerIdStr)) excludedList.push(offerIdStr);
      includedList = includedList.filter((id) => id !== offerIdStr);
    } else {
      // Włączamy do porównywania
      if (!includedList.includes(offerIdStr)) includedList.push(offerIdStr);
      excludedList = excludedList.filter((id) => id !== offerIdStr);
    }

    try {
      await api.put(`/repricer/offers/${selectedOffer.id}`, {
        excluded_offer_ids: excludedList,
        included_offer_ids: includedList,
      });
      toast.success("Zaktualizowano preferencje oferty konkurencji.");
      // Refresh competitors view
      openCompetitors(selectedOffer);
    } catch (err: any) {
      toast.error("Nie udało się zaktualizować ustawień aukcji.");
    }
  };

  const triggerAnalysis = async (offer: ChannelOffer) => {
    try {
      await api.post(`/repricer/offers/${offer.id}/trigger`);
      toast.success("Zakolejkowano analizę automatu cenowego.");
    } catch (err: any) {
      toast.error("Nie udało się uruchomić analizy.");
    }
  };

  const handleAlertAction = async (alertId: string, action: "APPLY" | "REJECT") => {
    try {
      const res = await api.post<{ message: string }>(`/repricer/alerts/${alertId}/action`, { action });
      toast.success(res.data.message);
      fetchAlerts();
      fetchOffers();
    } catch (err: any) {
      toast.error("Błąd wykonania akcji dla alertu.");
    }
  };

  const filteredOffers = offers.filter((o) => {
    const q = searchQuery.toLowerCase();
    return (
      o.external_offer_id.toLowerCase().includes(q) ||
      (o.product_name && o.product_name.toLowerCase().includes(q)) ||
      (o.ean_code && o.ean_code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/10 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-primary" />
            Automat Cenowy Allegro (Repricer po EAN)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoruj najniższe ceny konkurencji na Allegro po EAN i automatycznie dostosowuj marżę z uwzględnieniem progu minimalnego.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={openAddOfferModal}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj Ofertę do Śledzenia
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Odśwież
          </Button>
        </div>
      </div>

      <Tabs defaultValue="offers" className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="offers">Oferty & Konfiguracja ({offers.length})</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            Alerty Cenowe
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0.2 text-[10px]">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Offers List */}
        <TabsContent value="offers" className="mt-4 space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po nazwie, ID aukcji lub EAN..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Card className="glass">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold">Moje Oferty Allegro</CardTitle>
              <CardDescription>Zarządzaj zasadami śledzenia konkurencji i ustalaj cenę minimalną.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status Repricera</TableHead>
                    <TableHead>Nazwa Produktu</TableHead>
                    <TableHead>ID Aukcji Allegro</TableHead>
                    <TableHead>Kod EAN</TableHead>
                    <TableHead>Cena Aktualna</TableHead>
                    <TableHead>Cena Min.</TableHead>
                    <TableHead>Tryb</TableHead>
                    <TableHead>Krok / Dystans</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Brak ofert spełniających kryteria. Kliknij &quot;Dodaj Ofertę do Śledzenia&quot;, aby dodać nową aukcję.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOffers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={offer.is_repricing_enabled}
                              onCheckedChange={(checked) => handleToggleRepricing(offer, checked)}
                            />
                            <Badge variant={offer.is_repricing_enabled ? "default" : "secondary"}>
                              {offer.is_repricing_enabled ? "Włączony" : "Wyłączony"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm">{offer.product_name || "Produkt bez nazwy"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm font-semibold">{offer.external_offer_id}</div>
                        </TableCell>
                        <TableCell>
                          {offer.ean_code ? (
                            <span className="font-mono text-xs bg-muted/60 px-2 py-0.5 rounded">{offer.ean_code}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Brak EAN</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {offer.override_price ? `${offer.override_price.toFixed(2)} zł` : "Wg Magazynu"}
                        </TableCell>
                        <TableCell>
                          {offer.min_price ? (
                            <span className="text-emerald-600 font-medium">{offer.min_price.toFixed(2)} zł</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Nie ustawiono</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={offer.repricing_mode === "AUTO" ? "outline" : "destructive"}>
                            {offer.repricing_mode === "AUTO" ? "AUTO" : "Alert (E-mail)"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          -{offer.repricing_step_value} {offer.repricing_step_type === "AMOUNT" ? "zł" : "%"}
                          {offer.enable_price_increase && (
                            <div className="text-indigo-500 font-medium">+ Wzrost ceny WŁ.</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => openCompetitors(offer)} title="Rywalizacja na Allegro">
                            <Search className="h-4 w-4 mr-1" />
                            Allegro EAN
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openConfig(offer)}>
                            <Settings className="h-4 w-4 mr-1" />
                            Konfiguruj
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => triggerAnalysis(offer)}>
                            <Play className="h-4 w-4 mr-1" />
                            Uruchom
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Alerts */}
        <TabsContent value="alerts" className="mt-4">
          <Card className="glass">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Oczekujące Alerty Cenowe
              </CardTitle>
              <CardDescription>
                Konkurencja obniżyła cenę na Allegro. Przejrzyj sugerowane ceny i zdecyduj o ich zatwierdzeniu.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data powstania</TableHead>
                    <TableHead>Aukcja Allegro</TableHead>
                    <TableHead>Kod EAN</TableHead>
                    <TableHead>Cena Obecna</TableHead>
                    <TableHead>Najniższa Konkurencji</TableHead>
                    <TableHead>Sugerowana Nowa Cena</TableHead>
                    <TableHead>Cena Min.</TableHead>
                    <TableHead className="text-right">Decyzja</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Brak oczekujących alertów cenowych.
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm font-semibold">{alert.external_offer_id}</div>
                          {alert.competitor_offer_url && (
                            <a
                              href={alert.competitor_offer_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                            >
                              Konkurent: {alert.competitor_seller_name || "Allegro"}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          {alert.ean_code ? (
                            <span className="font-mono text-xs bg-muted/60 px-2 py-0.5 rounded">{alert.ean_code}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Brak EAN</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-700 dark:text-gray-300">
                          {alert.current_price.toFixed(2)} zł
                        </TableCell>
                        <TableCell className="text-rose-600 font-bold">
                          {alert.competitor_lowest_price.toFixed(2)} zł
                        </TableCell>
                        <TableCell className="text-emerald-600 font-extrabold text-base">
                          {alert.suggested_price.toFixed(2)} zł
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {alert.min_price ? `${alert.min_price.toFixed(2)} zł` : "Brak"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleAlertAction(alert.id, "APPLY")}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Zaakceptuj ({alert.suggested_price.toFixed(2)} zł)
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlertAction(alert.id, "REJECT")}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Odrzuć
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal 0: Dodaj Nową Ofertę do Automatu */}
      <Dialog open={isAddOfferOpen} onOpenChange={setIsAddOfferOpen}>
        <DialogContent className="sm:max-w-[540px] w-[95vw] max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Dodaj Ofertę do Automatu Cenowego</DialogTitle>
            <DialogDescription>
              Wybierz aukcję z listy połączonych powiadomień lub wkaż produkt z Magazynu. EAN zostanie pobrany automatycznie.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3 min-w-0">
            <div className="flex flex-col gap-1.5 min-w-0">
              <Label className="font-semibold">Wyznaczona Aukcja / Produkt *</Label>
              <Select value={selectedAuctionKey} onValueChange={(val) => handleSelectAuctionOption(val)}>
                <SelectTrigger className="w-full text-left font-normal truncate">
                  <SelectValue placeholder="Wybierz aukcję Allegro lub produkt..." />
                </SelectTrigger>
                <SelectContent className="max-w-[500px]">
                  {auctionOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addForm.is_manual_external_id && (
              <div className="flex flex-col gap-1.5 min-w-0">
                <Label className="font-semibold">Numer ID Aukcji Allegro *</Label>
                <Input
                  placeholder="np. 1234567890"
                  value={addForm.external_offer_id}
                  onChange={(e) => setAddForm({ ...addForm, external_offer_id: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">Kod EAN (GTIN z Allegro)</Label>
                  {addForm.external_offer_id && (
                    <button
                      type="button"
                      className="text-[11px] text-primary underline font-medium hover:text-primary/80"
                      onClick={() => fetchAllegroEan(addForm.service_integration_id, addForm.external_offer_id)}
                    >
                      Pobierz z Allegro
                    </button>
                  )}
                </div>
                <Input
                  placeholder="np. 5901234567890"
                  value={addForm.ean_code}
                  onChange={(e) => setAddForm({ ...addForm, ean_code: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-emerald-600 font-semibold">Cena Minimalna (PLN)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="np. 49.99"
                  value={addForm.min_price}
                  onChange={(e) => setAddForm({ ...addForm, min_price: e.target.value })}
                />
              </div>
            </div>

            {integrationsList.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold">Konto Integracji Allegro *</Label>
                <Select
                  value={addForm.service_integration_id}
                  onValueChange={(val) => setAddForm({ ...addForm, service_integration_id: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Wybierz konto Allegro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {integrationsList.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold">Tryb Działania</Label>
              <Select
                value={addForm.repricing_mode}
                onValueChange={(val: any) => setAddForm({ ...addForm, repricing_mode: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALERT">Tylko Alert (Powiadomienie E-mail)</SelectItem>
                  <SelectItem value="AUTO">Automatyczna zmiana ceny na Allegro (AUTO)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setIsAddOfferOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={submitAddOffer}>Włącz Śledzenie Ceny</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 1: Repricer Configuration */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[540px] w-[95vw] max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Konfiguracja Automatu Cenowego</DialogTitle>
            <DialogDescription>
              Ustaw parametry śledzenia dla aukcji {selectedOffer?.external_offer_id}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3 min-w-0">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <Label className="font-semibold">Włącz śledzenie automatu cenowego</Label>
                <p className="text-xs text-muted-foreground">Włącza pobieranie ofert konkurencji dla tej aukcji.</p>
              </div>
              <Switch
                checked={configForm.is_repricing_enabled}
                onCheckedChange={(c) => setConfigForm({ ...configForm, is_repricing_enabled: c })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold">Tryb Działania</Label>
                <Select
                  value={configForm.repricing_mode}
                  onValueChange={(val: any) => setConfigForm({ ...configForm, repricing_mode: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALERT">Tylko Alert / E-mail</SelectItem>
                    <SelectItem value="AUTO">Automatyczna zmiana (AUTO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold">Kod EAN do śledzenia</Label>
                <Input
                  placeholder="np. 5901234567890"
                  value={configForm.ean_code}
                  onChange={(e) => setConfigForm({ ...configForm, ean_code: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-emerald-600 font-semibold">Cena Minimalna (PLN)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="np. 49.99"
                  value={configForm.min_price}
                  onChange={(e) => setConfigForm({ ...configForm, min_price: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">Automat nie zejdzie poniżej tego progu.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold">Cena Maksymalna (PLN)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Opcjonalna granica górna"
                  value={configForm.max_price}
                  onChange={(e) => setConfigForm({ ...configForm, max_price: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold">Rodzaj Kroku / Dystansu</Label>
                <Select
                  value={configForm.repricing_step_type}
                  onValueChange={(val: any) => setConfigForm({ ...configForm, repricing_step_type: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMOUNT">Kwotowy (PLN)</SelectItem>
                    <SelectItem value="PERCENT">Procentowy (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold">Wartość Kroku</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.01"
                  value={configForm.repricing_step_value}
                  onChange={(e) => setConfigForm({ ...configForm, repricing_step_value: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <Label className="font-semibold">Podnoś cenę przy podwyżkach konkurencji</Label>
                <p className="text-xs text-muted-foreground">
                  Gdy najniższy konkurent podniesie cenę, automat podniesie naszą cenę zachowując dystans.
                </p>
              </div>
              <Switch
                checked={configForm.enable_price_increase}
                onCheckedChange={(c) => setConfigForm({ ...configForm, enable_price_increase: c })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3">
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold">Adres e-mail do alertów</Label>
                <Input
                  type="email"
                  placeholder="np. manager@firma.pl"
                  value={configForm.alert_email}
                  onChange={(e) => setConfigForm({ ...configForm, alert_email: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold">Częstotliwość analizy (minuty)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={configForm.check_interval_minutes}
                  onChange={(e) => setConfigForm({ ...configForm, check_interval_minutes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={saveConfig}>Zapisz Konfigurację</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Competitors po EAN na Allegro z miniaturką zdjęcia */}
      <Dialog open={competitorsModalOpen} onOpenChange={setCompetitorsModalOpen}>
        <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Oferty na Allegro dla EAN: {selectedOffer?.ean_code || "Brak EAN"}</DialogTitle>
            <DialogDescription>
              Lista znalezionych aukcji. Własne oferty są domyślnie wyłączone z porównywania, ale możesz włączyć je przełącznikiem.
            </DialogDescription>
          </DialogHeader>

          {competitorsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mr-2" />
              <span>Odpytywanie API Allegro po kodzie EAN...</span>
            </div>
          ) : competitorsData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Nie znaleziono aukcji konkurencji na Allegro dla tego EAN.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status Porównania</TableHead>
                    <TableHead>Zdjęcie & Tytuł Aukcji</TableHead>
                    <TableHead>Sprzedawca</TableHead>
                    <TableHead>Cena</TableHead>
                    <TableHead className="text-right">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitorsData.map((comp) => (
                    <TableRow key={comp.offer_id} className={comp.is_own ? "bg-muted/30" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={comp.active_in_comparison}
                            onCheckedChange={() => toggleCompetitorInclusion(comp)}
                          />
                          {comp.is_own ? (
                            <Badge variant="secondary">Własna aukcja</Badge>
                          ) : comp.active_in_comparison ? (
                            <Badge variant="default">Uwzględniana</Badge>
                          ) : (
                            <Badge variant="outline">Wykluczona</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="flex items-center gap-3">
                          {comp.image_url ? (
                            // eslint-disable-next-next/no-img-element
                            <img
                              src={comp.image_url}
                              alt={comp.title}
                              className="h-10 w-10 object-cover rounded border border-border shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-muted flex items-center justify-center rounded shrink-0">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-sm line-clamp-2">{comp.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{comp.seller_login || "Sprzedawca"}</TableCell>
                      <TableCell className="font-bold text-emerald-600">{comp.price.toFixed(2)} zł</TableCell>
                      <TableCell className="text-right">
                        <a href={comp.url} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
