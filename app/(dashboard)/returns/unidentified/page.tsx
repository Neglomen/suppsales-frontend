"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api, { getMediaUrl } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  ArrowLeft,
  Link as LinkIcon,
  Search,
  ExternalLink,
  MapPin,
  User,
  ShoppingBag,
  Clock,
  FileSearch,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Sub-components
function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 font-mono pb-2 mb-3.5 border-b border-white/5">
      {icon && <span className="text-primary/70">{icon}</span>}
      <span>{title}</span>
    </div>
  );
}

export default function UnidentifiedReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  
  // Order search states
  const [orderQuery, setOrderQuery] = useState("");
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [foundOrders, setFoundOrders] = useState<any[]>([]);
  const [selectedOrderToLink, setSelectedOrderToLink] = useState<any | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // Load unidentified returns
  const loadReturns = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/returns", {
        params: { isUnidentified: true, size: 50 }
      });
      setReturns(response.data.items || []);
      // Reset selected return if it was removed or refresh
      setSelectedReturn(null);
    } catch (err) {
      toast.error("Nie udało się załadować paczek niezidentyfikowanych.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  // Search orders to link to
  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) return;

    setIsSearchingOrder(true);
    setFoundOrders([]);
    setSelectedOrderToLink(null);

    try {
      const response = await api.get("/orders", {
        params: { search: orderQuery.trim(), size: 10 }
      });
      setFoundOrders(response.data.items || []);
    } catch (err) {
      toast.error("Wystąpił błąd podczas wyszukiwania zamówień.");
    } finally {
      setIsSearchingOrder(false);
    }
  };

  // Link selected return to selected order
  const handleLinkOrder = async () => {
    if (!selectedReturn || !selectedOrderToLink) return;

    setIsLinking(true);
    try {
      await api.post(`/returns/${selectedReturn.id}/link-order`, {
        order_id: selectedOrderToLink.id
      });
      toast.success("Zwrot został pomyślnie powiązany z zamówieniem!");
      
      // Reload list
      await loadReturns();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Nie udało się powiązać zwrotu.");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/returns"
          className="text-xs font-semibold text-muted-foreground hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do listy zwrotów
        </Link>
        
        <Link
          href="/returns/scanner"
          className="text-xs font-bold text-primary hover:text-primary-foreground flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary transition-all"
        >
          <Clock className="h-4 w-4" />
          Otwórz skaner magazynowy
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Unidentified Returns List */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="bg-[#0c0f1d]/50 border-white/10 backdrop-blur-xl shadow-xl">
            <CardContent className="p-5">
              <SectionHeader title="Niezidentyfikowane paczki (Brak powiązań)" icon={<FileSearch className="h-3.5 w-3.5" />} />
              
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : returns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground/60 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400/40 mx-auto" />
                  <p className="text-xs italic">Wszystkie paczki zostały zidentyfikowane!</p>
                  <p className="text-[10px] text-muted-foreground/40">Magazyn nie zgłosił żadnych paczek bez dokumentów.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {returns.map((ret) => (
                    <div
                      key={ret.id}
                      onClick={() => {
                        setSelectedReturn(ret);
                        setSelectedOrderToLink(null);
                        setFoundOrders([]);
                        setOrderQuery("");
                      }}
                      className={cn(
                        "p-3.5 rounded-xl border cursor-pointer transition-all",
                        selectedReturn?.id === ret.id
                          ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                          : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white truncate max-w-[70%]">
                          {ret.waybill_number || "Brak nr listu"}
                        </span>
                        <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[8px] font-bold uppercase tracking-wider">
                          Mystery Box
                        </Badge>
                      </div>
                      
                      {ret.warehouse_notes && (
                        <p className="text-[11px] text-white/60 line-clamp-2 mt-2 leading-relaxed italic">
                          "{ret.warehouse_notes}"
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-[10px] text-white/40 mt-3 pt-3 border-t border-white/5">
                        <span>Zgłoszono: {ret.created_at ? format(new Date(ret.created_at), "dd.MM.yyyy HH:mm") : "—"}</span>
                        {ret.photos && ret.photos.length > 0 && (
                          <span className="font-semibold text-yellow-500/80">{ret.photos.length} zdj.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Details and Matching panel */}
        <div className="lg:col-span-2">
          {selectedReturn ? (
            <div className="space-y-6">
              {/* Unidentified return detail card */}
              <Card className="bg-[#0c0f1d]/50 border-white/10 backdrop-blur-xl shadow-xl">
                <CardContent className="p-5 space-y-5">
                  <SectionHeader title="Szczegóły zgłoszonej paczki" icon={<FileSearch className="h-3.5 w-3.5" />} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider font-mono">Dane magazynowe</p>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-white/5">
                          <span className="text-white/60">Numer listu</span>
                          <span className="font-mono font-bold text-white">{selectedReturn.waybill_number || "—"}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/5">
                          <span className="text-white/60">Data przyjęcia</span>
                          <span className="font-semibold text-white">
                            {selectedReturn.created_at ? format(new Date(selectedReturn.created_at), "dd.MM.yyyy HH:mm") : "—"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 py-1.5">
                          <span className="text-white/60">Uwagi magazynu:</span>
                          <span className="text-white/80 italic bg-black/30 p-2.5 rounded-lg border border-white/5 mt-1">
                            {selectedReturn.warehouse_notes || "Brak uwag."}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Photos list */}
                    <div className="space-y-3">
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider font-mono">Wykonane zdjęcia</p>
                      {selectedReturn.photos && selectedReturn.photos.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedReturn.photos.map((url: string, i: number) => (
                            <a
                              key={i}
                              href={getMediaUrl(url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 hover:border-yellow-500/50 transition-all bg-black/40 block"
                            >
                              <img src={getMediaUrl(url)} alt="Return photo" className="w-full h-full object-cover" />
                              <span className="absolute bottom-1 right-1 bg-black/75 px-1 py-0.5 rounded text-[8px] font-bold text-white">
                                Zbliżenie
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic py-4">Brak zdjęć w zgłoszeniu.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order lookup and association card */}
              <Card className="bg-[#0c0f1d]/50 border-white/10 backdrop-blur-xl shadow-xl">
                <CardContent className="p-5 space-y-5">
                  <SectionHeader title="Wyszukiwanie i scalanie z zamówieniem" icon={<LinkIcon className="h-3.5 w-3.5" />} />
                  
                  <form onSubmit={handleSearchOrder} className="flex gap-2">
                    <Input
                      value={orderQuery}
                      onChange={(e) => setOrderQuery(e.target.value)}
                      placeholder="Wpisz ID zamówienia, login kupującego lub nazwisko..."
                      className="bg-black/25 border-white/10 rounded-xl focus:border-primary text-xs text-white placeholder:text-muted-foreground/30 h-10"
                    />
                    <Button
                      type="submit"
                      disabled={isSearchingOrder || !orderQuery.trim()}
                      className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 shrink-0 text-xs font-bold gap-1"
                    >
                      {isSearchingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Szukaj
                    </Button>
                  </form>

                  {/* Search results list */}
                  {foundOrders.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider font-mono">Wyniki wyszukiwania zamówień</p>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {foundOrders.map((order) => (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrderToLink(order)}
                            className={cn(
                              "p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 text-xs transition-all",
                              selectedOrderToLink?.id === order.id
                                ? "bg-primary/10 border-primary/40 text-primary"
                                : "bg-white/5 border-white/5 hover:border-white/10"
                            )}
                          >
                            <div className="min-w-0">
                              <p className="font-mono font-extrabold text-white flex items-center gap-1.5">
                                <ShoppingBag className="h-3.5 w-3.5 text-primary/60" />
                                {order.external_order_id}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1 flex-wrap">
                                <span className="flex items-center gap-0.5"><User className="h-3 w-3" /> {order.buyer_login || "Brak loginu"}</span>
                                <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {format(new Date(order.purchased_at), "dd.MM.yyyy")}</span>
                              </div>
                            </div>
                            
                            <Badge className="bg-white/5 text-white/60 border border-white/10 text-[9px] px-2 py-0.5 uppercase shrink-0">
                              Status: {order.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linking verification card */}
                  {selectedOrderToLink && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
                      <div className="text-xs space-y-2">
                        <p className="font-bold text-white">Czy na pewno chcesz powiązać tę paczkę?</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/60 pt-1">
                          <div>
                            <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider font-mono">Paczka zwrotna</p>
                            <p className="font-bold font-mono text-white mt-0.5">{selectedReturn.waybill_number}</p>
                            <p className="text-[10px] text-white/40 mt-1">Uwag: {selectedReturn.warehouse_notes || "brak"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider font-mono">Przypisać do zamówienia</p>
                            <p className="font-bold font-mono text-white mt-0.5">{selectedOrderToLink.external_order_id}</p>
                            <p className="text-[10px] text-white/40 mt-1">Klient: {selectedOrderToLink.buyer_first_name} {selectedOrderToLink.buyer_last_name} ({selectedOrderToLink.buyer_login})</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrderToLink(null)}
                          className="text-xs text-muted-foreground hover:text-white"
                        >
                          Anuluj
                        </Button>
                        <Button
                          onClick={handleLinkOrder}
                          disabled={isLinking}
                          className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs px-4 rounded-xl"
                        >
                          {isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-3.5 w-3.5" />}
                          Zatwierdź powiązanie
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-[#0c0f1d]/50 border-white/10 border-dashed backdrop-blur-xl shadow-xl flex flex-col items-center justify-center p-24 text-center h-[400px]">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <FileSearch className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <h3 className="text-sm font-bold text-white">Wybierz paczkę do weryfikacji</h3>
              <p className="text-xs text-muted-foreground/60 max-w-xs mt-1 leading-relaxed">
                Wybierz przesyłkę z lewej listy, by zapoznać się ze zdjęciami magazynowymi, uwagami i powiązać ją z właściwym zamówieniem klienta.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
