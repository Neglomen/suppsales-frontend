"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  ArrowLeft,
  Search,
  Camera,
  History,
  AlertCircle,
  Package,
  CheckCircle2,
  X,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReceiptForm } from "./_components/receipt-form";
import { UnidentifiedForm } from "./_components/unidentified-form";
import { cn } from "@/lib/utils";

// Helper for section headers
function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 font-mono pb-2 mb-3.5 border-b border-slate-200 dark:border-white/5">
      {icon && <span className="text-primary/70">{icon}</span>}
      <span>{title}</span>
    </div>
  );
}

export default function ReturnsScannerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<any | null>(null); // { type: 'RETURN'|'ORDER', data: any }
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [showUnidentifiedForm, setShowUnidentifiedForm] = useState(false);
  const [failedWaybill, setFailedWaybill] = useState("");

  // Camera scanner states
  const [Html5Qrcode, setHtml5Qrcode] = useState<any>(null);
  const [isScanningCamera, setIsScanningCamera] = useState(false);

  // 1. Dynamic import of html5-qrcode for SSR compatibility
  useEffect(() => {
    import("html5-qrcode").then((module) => {
      setHtml5Qrcode(() => module.Html5Qrcode);
    });
  }, []);

  useEffect(() => {
    if (!Html5Qrcode || !isScanningCamera) return;

    let html5Qrcode: any = null;

    const timer = setTimeout(() => {
      const element = document.getElementById("camera-reader-element");
      if (!element) {
        console.error("Camera container element not found in DOM");
        return;
      }

      html5Qrcode = new Html5Qrcode("camera-reader-element");
      html5Qrcode
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width: number, height: number) => ({
              width: width * 0.85,
              height: height * 0.45,
            }),
          },
          (decodedText: string) => {
            handleSearch(decodedText);
            html5Qrcode.stop().catch((e: any) => console.log(e));
            setIsScanningCamera(false);
          },
          () => {}
        )
        .catch((err: any) => {
          console.error("Błąd kamery:", err);
          toast.error("Nie udało się uruchomić aparatu.");
          setIsScanningCamera(false);
        });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch((e: any) => console.log(e));
      }
    };
  }, [Html5Qrcode, isScanningCamera]);

  // 3. Global Barcode Scanner Listener (USB/Bluetooth Keyboard Wedges)
  useEffect(() => {
    let chars: string[] = [];
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();

      // Scanners send keys extremely fast (< 40ms interval)
      if (currentTime - lastKeyTime > 40) {
        chars = [];
      }

      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (chars.length > 3) {
          const barcode = chars.join("").trim();
          handleSearch(barcode);
          e.preventDefault();
        }
        chars = [];
      } else if (e.key.length === 1) {
        chars.push(e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 4. API Search Handler
  const handleSearch = async (queryText: string) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery) return;

    setIsLoading(true);
    setMatchResult(null);
    setShowUnidentifiedForm(false);
    setFailedWaybill("");

    try {
      const response = await api.get("/returns/scanner/lookup", {
        params: { q: cleanQuery },
      });

      const resData = response.data;
      // Inject waybill number if found via tracking or scanned code
      resData.data.waybill_number = cleanQuery;

      setMatchResult(resData);
      toast.success(
        resData.type === "RETURN"
          ? "Znaleziono powiązany zwrot!"
          : "Znaleziono oryginalne zamówienie!"
      );

      // Add to session history
      setScanHistory((prev) => {
        const filtered = prev.filter((item) => item.waybill !== cleanQuery);
        return [
          {
            waybill: cleanQuery,
            type: resData.type,
            status: "FOUND",
            id: resData.id,
            timestamp: new Date(),
          },
          ...filtered,
        ];
      });
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || "Paczka nie została odnaleziona w bazie.";
      toast.error(errMsg);
      setFailedWaybill(cleanQuery);

      // Add to session history as orphan
      setScanHistory((prev) => {
        const filtered = prev.filter((item) => item.waybill !== cleanQuery);
        return [
          {
            waybill: cleanQuery,
            type: "UNKNOWN",
            status: "NOT_FOUND",
            timestamp: new Date(),
          },
          ...filtered,
        ];
      });
    } finally {
      setIsLoading(false);
      setSearchQuery("");
    }
  };

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const resetScannerState = () => {
    setMatchResult(null);
    setShowUnidentifiedForm(false);
    setFailedWaybill("");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Back Button */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Link
          href="/returns"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center sm:justify-start gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do listy zwrotów
        </Link>

        <Link
          href="/returns/unidentified"
          className="text-xs font-bold text-yellow-500 hover:text-yellow-400 flex items-center justify-center sm:justify-start gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/30 transition-all w-full sm:w-auto"
        >
          <FileSearch className="h-4 w-4" />
          Niezidentyfikowane paczki
        </Link>
      </div>

      {/* Main scanner grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Skanowanie i Wyszukiwanie */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl">
            <CardContent className="p-5 space-y-5">
              <SectionHeader title="Skaner Kodów Magazynowych" icon={<Package className="h-3.5 w-3.5" />} />

              <p className="text-xs text-muted-foreground leading-relaxed">
                Zeskanuj kod kreskowy listu przewozowego na paczce zwrotnej. Skanery USB/Bluetooth działają automatycznie w tle.
              </p>

              {/* Camera Scanner View */}
              {isScanningCamera ? (
                <div className="relative rounded-xl border border-slate-200 dark:border-white/15 bg-black/60 overflow-hidden flex flex-col items-center">
                  <div id="camera-reader-element" className="w-full max-h-[220px]" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsScanningCamera(false)}
                    className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full bg-black/70 hover:bg-black/90 text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="text-[10px] text-white/50 py-1.5 uppercase font-mono tracking-wider">Trwa skanowanie kamerą...</p>
                </div>
              ) : (
                <Button
                  onClick={() => setIsScanningCamera(true)}
                  className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary gap-2 py-5 rounded-xl text-xs font-bold transition-all"
                >
                  <Camera className="h-4 w-4" />
                  Uruchom aparat (Skaner)
                </Button>
              )}

              <div className="flex items-center gap-3">
                <span className="h-px bg-slate-200 dark:bg-white/5 flex-1" />
                <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-bold font-mono">lub manualnie</span>
                <span className="h-px bg-slate-200 dark:bg-white/5 flex-1" />
              </div>

              {/* Manual Input Search */}
              <form onSubmit={handleManualSearchSubmit} className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Wpisz nr listu przewozowego..."
                  className="bg-slate-50 dark:bg-black/25 border-slate-200 dark:border-white/10 rounded-xl focus:border-primary text-xs text-foreground placeholder:text-muted-foreground/45 h-10"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 shrink-0 text-white"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Session Scan History */}
          <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl">
            <CardContent className="p-5">
              <SectionHeader title="Ostatnio zeskanowane paczki" icon={<History className="h-3.5 w-3.5" />} />

              {scanHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 italic text-center py-6">Brak skanów w tej sesji.</p>
              ) : (
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {scanHistory.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSearch(item.waybill)}
                      className={cn(
                        "p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-all",
                        item.status === "FOUND"
                          ? "border-emerald-500/10 bg-emerald-500/5 hover:border-emerald-500/20"
                          : "border-rose-500/10 bg-rose-500/5 hover:border-rose-500/20"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-foreground truncate">{item.waybill}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {item.type === "RETURN" ? "Zwrot" : item.type === "ORDER" ? "Zamówienie" : "Niezidentyfikowana"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status === "FOUND" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-rose-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dynamic Form Content */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl flex flex-col items-center justify-center p-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground font-semibold">Trwa wyszukiwanie powiązań w bazie...</p>
            </Card>
          ) : matchResult ? (
            <ReceiptForm
              data={matchResult.data}
              type={matchResult.type}
              onSuccess={resetScannerState}
              onCancel={resetScannerState}
            />
          ) : showUnidentifiedForm ? (
            <UnidentifiedForm
              initialWaybill={failedWaybill}
              onSuccess={resetScannerState}
              onCancel={resetScannerState}
            />
          ) : failedWaybill ? (
            <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-rose-500/20 backdrop-blur-xl shadow-xl text-center p-10 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Nie odnaleziono powiązań</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                  List przewozowy <span className="font-mono text-foreground font-bold">{failedWaybill}</span> nie pasuje do żadnego zamówienia ani aktywnego zwrotu.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2 max-w-xs mx-auto">
                <Button
                  onClick={() => setShowUnidentifiedForm(true)}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl text-xs py-4"
                >
                  Przyjmij jako Mystery Box
                </Button>
                <Button
                  variant="ghost"
                  onClick={resetScannerState}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Spróbuj ponownie
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 border-dashed backdrop-blur-xl shadow-xl flex flex-col items-center justify-center p-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Oczekiwanie na skanowanie</h3>
              <p className="text-xs text-muted-foreground/60 max-w-xs mt-1 leading-relaxed">
                Zeskanuj kod kreskowy listu przewozowego za pomocą czytnika lub uruchom skanowanie kamerą urządzenia.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
