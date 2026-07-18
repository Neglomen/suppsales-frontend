"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Sparkles,
  Play,
  Clock,
  Lock,
  Unlock,
  Loader2,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Video,
  AlertCircle
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { AnimatedBackground } from "@/components/shared/grid-background";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { MarketingNavbar, MarketingFooter } from "@/components/shared/marketing-nav";

interface AcademyVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  video_path: string;
  duration?: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "Podstawy / Ogólne",
  orders: "Zarządzanie Zamówieniami",
  shipping: "Wysyłki i Spedycja",
  erp: "ERP i Subiekt"
};

const MOCK_TEASERS = [
  {
    id: "teaser-1",
    title: "Onboarding i konfiguracja konta",
    category: "general",
    duration: "2:45",
    description: "Zacznij tutaj. Krótkie omówienie interfejsu, dodawanie pierwszej organizacji oraz konfiguracja podstawowych danych firmy.",
    locked: true
  },
  {
    id: "teaser-2",
    title: "Jak podłączyć integrację Allegro?",
    category: "orders",
    duration: "4:20",
    description: "Kompletny proces autoryzacji konta Allegro, mapowanie statusów zamówień i włączanie automatycznej synchronizacji.",
    locked: true
  },
  {
    id: "teaser-3",
    title: "Nadawanie paczek i automatyczna spedycja",
    category: "shipping",
    duration: "3:50",
    description: "Konfiguracja kuriera InPost i brokera Apaczka. Jak ustawić automatyczne generowanie etykiet po opłaceniu zamówienia.",
    locked: true
  },
  {
    id: "teaser-4",
    title: "Synchronizacja stanów i cen z Subiekt ERP",
    category: "erp",
    duration: "6:15",
    description: "Instrukcja instalacji agenta lokalnego, parowanie produktów oraz włączanie cyklicznej synchronizacji stanów magazynowych.",
    locked: true
  }
];

export default function AcademyPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  
  const [videos, setVideos] = useState<AcademyVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<AcademyVideo | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const fetchVideos = async () => {
      try {
        const res = await api.get<AcademyVideo[]>("/help");
        setVideos(res.data);
      } catch (err) {
        console.error("Failed to fetch academy videos:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [isAuthenticated, _hasHydrated]);

  const handleCardClick = (video: any, isTeaser: boolean) => {
    if (!isAuthenticated || isTeaser) {
      setShowUnlockModal(true);
    } else {
      setSelectedVideo(video);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden relative selection:bg-primary selection:text-white">
      {/* Glow background effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <MarketingNavbar />

      {/* Main Content */}
      <main className="flex-1 relative z-10 py-16">
        <div className="container mx-auto px-6 lg:px-12 max-w-5xl space-y-12">
          
          {/* Hero Section */}
          <div className="text-center space-y-5 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5 text-primary animate-pulse" /> SuppSales Academy
            </span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight text-slate-100">
              Centrum Wiedzy i Center <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-pink-500">
                Wideo Poradników
              </span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Krótkie, praktyczne instrukcje wideo, które pomogą Tobie i Twojemu zespołowi opanować konfigurację integracji, ERP oraz obsługę zamówień.
            </p>

            {_hasHydrated && !isAuthenticated && (
              <div className="flex items-center justify-center gap-2 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl px-4 py-2.5 max-w-md mx-auto">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Zaloguj się, aby odblokować bezpłatny dostęp do odtwarzacza wideo.</span>
              </div>
            )}
          </div>

          {/* Videos Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs text-slate-500 font-medium">Ładowanie lekcji wideo...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              
              {/* If Authenticated and has DB videos, render them */}
              {isAuthenticated && videos.length > 0 ? (
                videos.map((video) => {
                  const videoUrl = video.video_path.startsWith("http")
                    ? video.video_path
                    : `${api.defaults.baseURL?.replace("/api/v1", "")}${video.video_path}`;

                  return (
                    <Card
                      key={video.id}
                      onClick={() => handleCardClick(video, false)}
                      className="glass border-white/5 bg-slate-900/20 hover:bg-slate-900/40 backdrop-blur-xl rounded-2xl overflow-hidden border hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group cursor-pointer flex flex-col h-full"
                    >
                      {/* Video Thumbnail Hover Play */}
                      <div className="relative aspect-video w-full bg-slate-950 border-b border-white/5 overflow-hidden shrink-0 group/video flex items-center justify-center">
                        <video
                          src={videoUrl}
                          preload="metadata"
                          muted
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-all duration-300 group-hover:scale-105"
                          onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                        
                        <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-lg shadow-black/40 z-10 pointer-events-none">
                          <Play className="h-6 w-6 fill-current translate-x-0.5" />
                        </div>

                        {video.duration && (
                          <span className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg px-2 py-0.5 text-[10px] font-bold font-mono text-white tracking-wider flex items-center gap-1 z-10">
                            <Clock className="h-3 w-3" />
                            {video.duration}
                          </span>
                        )}
                        <div className="absolute top-3 left-3 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-400 rounded-lg px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1 z-10">
                          <Unlock className="h-3 w-3" /> Odblokowane
                        </div>
                      </div>

                      {/* Card Content */}
                      <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                            {CATEGORY_LABELS[video.category] || video.category}
                          </Badge>
                          <h3 className="font-extrabold text-base text-slate-100 group-hover:text-primary transition-colors leading-tight">
                            {video.title}
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                            {video.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                /* Unauthenticated or empty fallback -> render Mock Teasers */
                MOCK_TEASERS.map((teaser) => (
                  <Card
                    key={teaser.id}
                    onClick={() => handleCardClick(teaser, true)}
                    className="glass border-white/5 bg-slate-900/10 hover:bg-slate-900/20 backdrop-blur-xl rounded-2xl overflow-hidden border hover:border-amber-500/20 hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col h-full"
                  >
                    {/* Thumbnail / Locked Overlay */}
                    <div className="relative aspect-video w-full bg-slate-950 border-b border-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                      <div className="absolute inset-0 bg-slate-900/60 z-10 flex flex-col items-center justify-center gap-2 group-hover:bg-slate-900/50 transition-colors">
                        <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:border-amber-500/30 group-hover:text-amber-400 transition-all duration-300 shadow-xl shadow-black/40">
                          <Lock className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Zablokowane</span>
                      </div>
                      
                      <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg px-2 py-0.5 text-[10px] font-bold font-mono text-white tracking-wider flex items-center gap-1 z-10">
                        <Clock className="h-3 w-3" />
                        {teaser.duration}
                      </div>
                    </div>

                    {/* Card Content */}
                    <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <Badge variant="outline" className="bg-slate-900/40 text-slate-400 border-white/10 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                          {CATEGORY_LABELS[teaser.category] || teaser.category}
                        </Badge>
                        <h3 className="font-extrabold text-base text-slate-300 group-hover:text-amber-400 transition-colors leading-tight">
                          {teaser.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {teaser.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

            </div>
          )}

          {/* Bottom Call to Action */}
          <div className="rounded-3xl border border-white/5 bg-slate-900/30 backdrop-blur-md p-8 md:p-12 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10" />
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100">Chcesz odblokować pełne szkolenia?</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Zaloguj się do swojego darmowego panelu deweloperskiego lub zarejestruj nowe konto w SuppSales, by uzyskać natychmiastowy dostęp do wszystkich lekcji.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                asChild
                className="bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl px-6 h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01] border-none"
              >
                <Link href="/login" className="flex items-center gap-2">
                  Zaloguj się do akademii <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <MarketingFooter />

      {/* Video Modal Player (For authenticated users) */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="sm:max-w-[960px] p-0 overflow-hidden border border-white/10 bg-slate-950/95 text-slate-100 rounded-2xl shadow-2xl backdrop-blur-3xl">
          <DialogTitle className="sr-only">
            {selectedVideo?.title || "Podgląd wideo"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {selectedVideo?.description || "Opis filmu szkoleniowego"}
          </DialogDescription>
          
          <div className="flex flex-col">
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

            {selectedVideo && (
              <div className="p-6 space-y-3 bg-slate-900/30 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                    {CATEGORY_LABELS[selectedVideo.category] || selectedVideo.category}
                  </Badge>
                  {selectedVideo.duration && (
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {selectedVideo.duration}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-slate-100">{selectedVideo.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedVideo.description}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unlock Notice Modal (For unauthenticated users) */}
      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent className="sm:max-w-[480px] p-6 border border-white/10 bg-slate-900/90 text-slate-100 rounded-2xl shadow-2xl backdrop-blur-2xl">
          <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-400" /> Wideo zablokowane
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400 mt-2 leading-relaxed">
            Te lekcje szkoleniowe są dostępne wyłącznie dla zalogowanych użytkowników i pracowników korzystających z platformy SuppSales.
          </DialogDescription>
          
          <div className="space-y-4 pt-4">
            <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl space-y-2">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Dlaczego warto?</span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dostęp do pełnej biblioteki wideo-poradników pozwala zredukować czas potrzebny na wdrożenie pracowników magazynu i biura obsługi klienta o ponad 70%.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowUnlockModal(false)}
                className="rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-200"
              >
                Zamknij
              </Button>
              <Button
                asChild
                className="bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl"
              >
                <Link href="/login">Zaloguj się</Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
