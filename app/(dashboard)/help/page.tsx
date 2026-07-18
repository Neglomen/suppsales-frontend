"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  BookOpen,
  ShieldCheck,
  Truck,
  RefreshCcw,
  HelpCircle,
  Play,
  Search,
  Clock,
  Sparkles,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  video_path: string;
  duration?: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "all", label: "Wszystkie instrukcje" },
  { value: "general", label: "Ogólne / Podstawy" },
  { value: "orders", label: "Zarządzanie Zamówieniami" },
  { value: "shipping", label: "Wysyłki i Spedycja" },
  { value: "erp", label: "ERP i Subiekt" },
];

export default function HelpPage() {
  const [videos, setVideos] = useState<HelpVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedVideo, setSelectedVideo] = useState<HelpVideo | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await api.get<HelpVideo[]>("/help");
        setVideos(res.data);
      } catch (err) {
        console.error("Failed to fetch help videos", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideos();
  }, []);

  // Filter videos based on category and search query
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesCategory = activeCategory === "all" || video.category === activeCategory;
      const matchesSearch =
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [videos, activeCategory, searchQuery]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "general": return ShieldCheck;
      case "orders": return Sparkles;
      case "shipping": return Truck;
      case "erp": return RefreshCcw;
      default: return HelpCircle;
    }
  };

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat;
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto w-full pb-20 text-foreground">
      
      {/* Header Section with Ambient Glow */}
      <div className="relative text-center space-y-5 py-12 rounded-3xl overflow-hidden bg-slate-900/40 border border-border/30 backdrop-blur-md">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10" />
        
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75">
          SuppSales Academy
        </h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto px-4">
          Wideo-poradniki i odpowiedzi na najczęstsze pytania ułatwiające codzienną pracę z systemem.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto px-4 mt-6">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj instrukcji..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background border-border text-foreground placeholder-muted-foreground focus:border-primary/50 shadow-inner h-11"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-2 border-b border-border/30 pb-4">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant="ghost"
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all h-9 border",
              activeCategory === cat.value
                ? "bg-primary/15 text-primary border-primary/25 shadow-sm"
                : "text-muted-foreground hover:text-foreground bg-slate-950/5 dark:bg-white/[0.02] border-transparent hover:bg-slate-950/10 dark:hover:bg-white/5"
            )}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Video Academy Grid */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <span className="h-4 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
          Poradniki Wideo
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-16 bg-muted/10 border border-dashed border-border rounded-2xl space-y-2">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <h3 className="font-bold text-muted-foreground text-sm">Brak wyników</h3>
            <p className="text-xs text-muted-foreground/60">Nie znaleziono wideo instrukcji dopasowanych do wybranych filtrów.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredVideos.map((video) => {
              const Icon = getCategoryIcon(video.category);
              const videoUrl = video.video_path.startsWith("http")
                ? video.video_path
                 : `${api.defaults.baseURL?.replace("/api/v1", "")}${video.video_path}`;

              return (
                <Card
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="border-border/30 bg-card/40 hover:bg-card/75 backdrop-blur-xl rounded-2xl overflow-hidden border hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group cursor-pointer flex flex-col h-full"
                >
                  {/* Thumbnail / Play trigger */}
                  <div className="relative aspect-video w-full bg-slate-950/10 dark:bg-slate-950 border-b border-border/30 overflow-hidden shrink-0 group/video flex items-center justify-center">
                    <video
                      src={videoUrl}
                      preload="metadata"
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-all duration-300 group-hover:scale-105"
                      onMouseEnter={(e) => {
                        e.currentTarget.play().catch(() => {});
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                    
                    {/* Play button overlay */}
                    <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-lg shadow-black/40 z-10 pointer-events-none">
                      <Play className="h-6 w-6 fill-current translate-x-0.5" />
                    </div>
                    {/* Video details badges inside thumbnail */}
                    {video.duration && (
                      <span className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md border border-border/30 rounded-lg px-2 py-0.5 text-[10px] font-bold font-mono text-white tracking-wider flex items-center gap-1 z-10">
                        <Clock className="h-3 w-3" />
                        {video.duration}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.1),rgba(0,0,0,0.4))] pointer-events-none" />
                  </div>

                  {/* Card Details */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                          {getCategoryLabel(video.category)}
                        </Badge>
                      </div>
                      <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors leading-tight">
                        {video.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {video.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed FAQ Section */}
      <Card className="border-border/30 bg-card/40 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden hover:border-primary/10 transition-all">
        <CardHeader className="border-b border-border/30 pb-4">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Często Zadawane Pytania (FAQ)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-5">
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-foreground">Jak zacząć pracę z systemem?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">Najpierw skonfiguruj integrację z platformą sprzedażową w zakładce Integracje. Następnie podłącz KSeF, aby automatycznie wystawiać dokumenty sprzedaży.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-foreground">Czy moje dane są bezpieczne?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">Tak, korzystamy z bezpiecznych połączeń szyfrowanych (SSL) oraz przechowujemy dane zgodnie ze standardami bezpieczeństwa i RODO. Tokeny KSeF są przechowywane w postaci zaszyfrowanej.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-foreground">Jak skontaktować się ze wsparciem?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">Możesz wysłać wiadomość bezpośrednio z panelu lub skontaktować się z dedykowanym opiekunem klienta przez nasz adres pomoc@suppsales.pl.</p>
          </div>
        </CardContent>
      </Card>

      {/* Video Modal Player */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="sm:max-w-[960px] p-0 overflow-hidden border border-border/60 bg-background text-foreground rounded-2xl shadow-2xl backdrop-blur-3xl">
          <DialogTitle className="sr-only">
            {selectedVideo?.title || "Podgląd wideo"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {selectedVideo?.description || "Opis filmu instruktażowego"}
          </DialogDescription>
          <div className="flex flex-col">
            {/* Video Player */}
            <div className="relative aspect-video bg-black flex items-center justify-center w-full">
              {selectedVideo && (
                <video
                  src={selectedVideo.video_path.startsWith("http")
                    ? selectedVideo.video_path
                    : `${api.defaults.baseURL?.replace("/api/v1", "")}${selectedVideo.video_path}`}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Metadata Section */}
            {selectedVideo && (
              <div className="p-6 space-y-3 bg-muted/40 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                    {getCategoryLabel(selectedVideo.category)}
                  </Badge>
                  {selectedVideo.duration && (
                    <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {selectedVideo.duration}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-foreground">{selectedVideo.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedVideo.description}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
