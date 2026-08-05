"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  Truck,
  Calendar,
  Download,
  Loader2,
  Check,
  Filter,
} from "lucide-react";
import api, { getErrorMessage } from "@/lib/api";
import { ServiceIntegration } from "@/types/service-integration";
import { toast } from "react-hot-toast";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReportType?: "sales_summary" | "sales_by_channel" | "uninvoiced_orders" | "shipments";
}

type DateMode = "month" | "range";

export default function ReportModal({
  isOpen,
  onClose,
  defaultReportType = "sales_summary",
}: ReportModalProps) {
  const [reportType, setReportType] = useState<string>(defaultReportType);
  const [dateMode, setDateMode] = useState<DateMode>("month");
  
  // Month selection
  const monthOptions = React.useMemo(() => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
      options.push({
        value: monthVal,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
    }
    return options;
  }, []);
  
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0]?.value || "");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [dateType, setDateType] = useState<string>("erp_sales_document_synced_at");
  
  // Integrations filtering
  const [integrations, setIntegrations] = useState<ServiceIntegration[]>([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState<number[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Sync state if defaultReportType changes
  useEffect(() => {
    if (isOpen) {
      setReportType(defaultReportType);
    }
  }, [defaultReportType, isOpen]);

  // Fetch integrations on open
  useEffect(() => {
    if (isOpen) {
      const fetchIntegrations = async () => {
        setIsLoadingIntegrations(true);
        try {
          const res = await api.get<ServiceIntegration[]>("/service-integrations");
          // Filter only active marketplace integrations
          const marketplaces = res.data.filter(
            (int) => int.category === "MARKETPLACE" && int.is_active
          );
          setIntegrations(marketplaces);
        } catch (error) {
          console.error("Failed to fetch integrations", error);
          toast.error("Nie udało się pobrać kanałów sprzedaży");
        } finally {
          setIsLoadingIntegrations(false);
        }
      };
      fetchIntegrations();
    }
  }, [isOpen]);

  const handleToggleIntegration = (id: number) => {
    setSelectedIntegrations((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllIntegrations = () => {
    if (selectedIntegrations.length === integrations.length) {
      setSelectedIntegrations([]);
    } else {
      setSelectedIntegrations(integrations.map((i) => i.id));
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);
    const downloadToast = toast.loading("Generowanie i pobieranie raportu...");
    try {
      const params: Record<string, any> = {
        report_type: reportType,
        date_type: dateType,
      };

      if (dateMode === "month") {
        params.month = selectedMonth;
      } else {
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
      }

      if (selectedIntegrations.length > 0) {
        params.integration_ids = selectedIntegrations;
      }

      const response = await api.get("/reports/export", {
        params,
        responseType: "blob",
        // Avoid converting array to square bracket format in qs
        paramsSerializer: {
          indexes: null,
        },
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Extract filename from response headers if available
      const disposition = response.headers["content-disposition"];
      let filename = `raport_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      if (disposition && disposition.includes("filename=")) {
        const matches = disposition.split("filename=");
        if (matches[1]) {
          filename = matches[1].replace(/['"]/g, "").trim();
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Raport pobrany pomyślnie!", { id: downloadToast });
      onClose();
    } catch (error) {
      console.error("Export error", error);
      toast.error(`Błąd podczas eksportowania: ${getErrorMessage(error)}`, {
        id: downloadToast,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const reportOptions = [
    {
      id: "sales_summary",
      title: "Zestawienie sprzedaży (Faktury ERP)",
      description: "Zestawienie wystawionych FV, powiązane z pozycjami zamówień i listami przewozowymi.",
      icon: FileSpreadsheet,
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40",
    },
    {
      id: "sales_by_channel",
      title: "Sprzedaż według kanałów",
      description: "Agregacja zamówień i obrotów brutto z podziałem na poszczególne integracje marketplace.",
      icon: TrendingUp,
      color: "text-blue-400 border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40",
    },
    {
      id: "uninvoiced_orders",
      title: "Zamówienia bez faktury ERP",
      description: "Lista aktywnych zamówień, które nie mają jeszcze wpisanego numeru faktury ERP.",
      icon: AlertTriangle,
      color: "text-amber-400 border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40",
    },
    {
      id: "shipments",
      title: "Wysyłki kurierskie",
      description: "Zestawienie wszystkich nadanych przesyłek z numerami listów i statusami.",
      icon: Truck,
      color: "text-purple-400 border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="glass border-border/30 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
            <span className="h-5 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
            Eksportuj raporty i zestawienia
          </DialogTitle>
          <DialogDescription>
            Wybierz typ raportu, określ filtry czasowe oraz kanały sprzedaży do wyeksportowania w formacie Excel (.xlsx).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Typ raportu */}
          <div className="space-y-3">
            <Label className="text-sm font-bold text-foreground/90">Wybierz typ raportu</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reportOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = reportType === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setReportType(opt.id)}
                    disabled={isExporting}
                    className={`relative flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all duration-300 ${
                      isSelected
                        ? "border-primary/50 bg-primary/10 shadow-md shadow-primary/5 scale-[1.01]"
                        : "border-border/30 bg-accent/2 hover:bg-accent/5"
                    } ${isExporting ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <div className={`p-2 rounded-lg border ${opt.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-bold text-sm text-foreground">{opt.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white scale-90">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtry czasowe */}
          <div className="space-y-4 p-4 rounded-xl border border-border/20 bg-accent/5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Label className="text-sm font-bold text-foreground/90 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                Filtry czasowe
              </Label>
              <div className="flex p-0.5 bg-accent/15 border border-border/20 rounded-lg max-w-fit">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setDateMode("month")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    dateMode === "month"
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Miesiąc
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setDateMode("range")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    dateMode === "range"
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Zakres dat
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dateMode === "month" ? (
                <div className="col-span-2 space-y-2">
                  <Label className="text-xs text-muted-foreground">Wybierz miesiąc</Label>
                  <div className="relative">
                    <select
                      disabled={isExporting}
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border/30 bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                    >
                      {monthOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data od</Label>
                    <input
                      type="date"
                      disabled={isExporting}
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border/30 bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data do</Label>
                    <input
                      type="date"
                      disabled={isExporting}
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border/30 bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Typ daty do filtracji */}
            <div className="space-y-2 pt-2 border-t border-border/20">
              <Label className="text-xs text-muted-foreground">Filtruj po dacie</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer">
                  <input
                    type="radio"
                    disabled={isExporting}
                    name="dateType"
                    value="erp_sales_document_synced_at"
                    checked={dateType === "erp_sales_document_synced_at"}
                    onChange={() => setDateType("erp_sales_document_synced_at")}
                    className="accent-primary"
                  />
                  Data wystawienia faktury ERP
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer">
                  <input
                    type="radio"
                    disabled={isExporting}
                    name="dateType"
                    value="purchased_at"
                    checked={dateType === "purchased_at"}
                    onChange={() => setDateType("purchased_at")}
                    className="accent-primary"
                  />
                  Data zakupu zamówienia
                </label>
              </div>
            </div>
          </div>

          {/* Filtry kanałów */}
          <div className="space-y-3 p-4 rounded-xl border border-border/20 bg-accent/5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-foreground/90 flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-primary" />
                Kanały sprzedaży
              </Label>
              {integrations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isExporting}
                  onClick={handleSelectAllIntegrations}
                  className="h-7 text-xs font-semibold text-primary hover:text-primary/80 hover:bg-transparent p-0"
                >
                  {selectedIntegrations.length === integrations.length
                    ? "Odznacz wszystkie"
                    : "Zaznacz wszystkie"}
                </Button>
              )}
            </div>

            {isLoadingIntegrations ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Ładowanie kanałów sprzedaży...
              </div>
            ) : integrations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Brak aktywnej integracji typu marketplace. Wszystkie dane zostaną uwzględnione w eksporcie.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-36 overflow-y-auto pr-1">
                {integrations.map((integration) => {
                  const isChecked = selectedIntegrations.includes(integration.id);
                  return (
                    <div
                      key={integration.id}
                      onClick={() => !isExporting && handleToggleIntegration(integration.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all cursor-pointer select-none ${
                        isChecked
                          ? "border-primary/45 bg-primary/5 text-foreground font-semibold"
                          : "border-border/20 hover:bg-accent/5 text-muted-foreground hover:text-foreground"
                      } ${isExporting ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleIntegration(integration.id)}
                        disabled={isExporting}
                        className="pointer-events-none scale-90"
                      />
                      <span className="text-xs truncate">{integration.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border/20 pt-4 flex sm:justify-between items-center gap-3">
          <p className="text-[11px] text-muted-foreground mr-auto hidden sm:block">
            * Pliki raportu generowane są w czasie rzeczywistym i mogą zawierać do kilku tysięcy wierszy.
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              disabled={isExporting}
              onClick={onClose}
              className="w-full sm:w-auto border-border/30 rounded-xl h-10 hover:bg-accent/5"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isExporting}
              className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white rounded-xl h-10 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 px-5"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generowanie...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Pobierz raport (.xlsx)
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
