"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Video,
  Play,
  Check,
  X,
  FileVideo,
  Eye,
  EyeOff,
  FolderOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  { value: "general", label: "Ogólne / Podstawy" },
  { value: "orders", label: "Zarządzanie Zamówieniami" },
  { value: "shipping", label: "Wysyłki i Spedycja" },
  { value: "erp", label: "ERP i Subiekt" },
];

export default function SuperAdminHelpPage() {
  const [videos, setVideos] = useState<HelpVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<HelpVideo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [duration, setDuration] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<HelpVideo[]>("/help/admin");
      setVideos(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Nie udało się pobrać listy filmów instruktażowych.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const openAddDialog = () => {
    setEditingVideo(null);
    setTitle("");
    setDescription("");
    setCategory("general");
    setDuration("");
    setIsActive(true);
    setSelectedFile(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (video: HelpVideo) => {
    setEditingVideo(video);
    setTitle(video.title);
    setDescription(video.description);
    setCategory(video.category);
    setDuration(video.duration || "");
    setIsActive(video.is_active);
    setSelectedFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (video: HelpVideo) => {
    if (!confirm(`Czy na pewno chcesz usunąć film: "${video.title}"? Plik wideo zostanie trwale usunięty z serwera.`)) {
      return;
    }

    const toastId = toast.loading("Usuwanie filmu...");
    try {
      await api.delete(`/help/admin/${video.id}`);
      toast.success("Film został pomyślnie usunięty.", { id: toastId });
      fetchVideos();
    } catch (err) {
      console.error(err);
      toast.error("Nie udało się usunąć filmu.", { id: toastId });
    }
  };

  const handleToggleActive = async (video: HelpVideo) => {
    const toastId = toast.loading(video.is_active ? "Dezaktywacja filmu..." : "Aktywacja filmu...");
    try {
      const formData = new FormData();
      formData.append("is_active", String(!video.is_active));
      
      await api.patch(`/help/admin/${video.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success(video.is_active ? "Film został ukryty." : "Film jest teraz aktywny.", { id: toastId });
      fetchVideos();
    } catch (err) {
      console.error(err);
      toast.error("Nie udało się zmienić statusu filmu.", { id: toastId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) {
      toast.error("Wypełnij wymagane pola (Tytuł, opis, kategoria).");
      return;
    }

    if (!editingVideo && !selectedFile) {
      toast.error("Wybierz plik wideo (.mp4) do wgrania.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(editingVideo ? "Aktualizowanie filmu..." : "Wgrywanie filmu na serwer (to może chwilę potrwać)...");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      if (duration.trim()) {
        formData.append("duration", duration.trim());
      }
      formData.append("is_active", String(isActive));
      
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      if (editingVideo) {
        await api.patch(`/help/admin/${editingVideo.id}`, formData, config);
        toast.success("Film instruktażowy został zaktualizowany.", { id: toastId });
      } else {
        await api.post("/help/admin", formData, config);
        toast.success("Nowy film został pomyślnie dodany.", { id: toastId });
      }

      setIsDialogOpen(false);
      fetchVideos();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Wystąpił błąd podczas zapisywania filmu.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Zarządzanie Poradnikami Wideo
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Dodawaj, edytuj i usuwaj nagrania wideo przydatne dla Twoich pracowników.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-5 shadow-lg shadow-primary/20 shrink-0 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Dodaj nowy film
        </Button>
      </div>

      {/* Main Content */}
      <Card className="glass border-white/5 bg-slate-900/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Lista Filmów Instruktażowych
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-3">
              <FileVideo className="h-12 w-12 text-slate-600" />
              <h3 className="font-bold text-slate-300">Brak wgranych filmów</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Nie dodałeś jeszcze żadnych wideo. Kliknij przycisk „Dodaj nowy film”, aby wgrać pierwsze nagranie.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Tytuł i Opis</th>
                    <th className="py-4 px-6">Kategoria</th>
                    <th className="py-4 px-6 text-center">Czas trwania</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {videos.map((video) => {
                    const videoUrl = video.video_path.startsWith("http")
                      ? video.video_path
                      : `${api.defaults.baseURL?.replace("/api/v1", "")}${video.video_path}`;

                    return (
                      <tr
                        key={video.id}
                        className="hover:bg-white/[0.01] transition-all group"
                      >
                        <td className="py-4 px-6 min-w-[320px]">
                          <div className="flex items-start gap-3">
                            <div
                              onClick={() => setPreviewVideoUrl(videoUrl)}
                              className="h-12 w-20 rounded-lg bg-slate-950 border border-white/10 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-900 hover:text-primary hover:border-primary/40 transition-all shrink-0 relative overflow-hidden group/thumb"
                            >
                              <Play className="h-5 w-5 text-white/80 group-hover/thumb:scale-125 transition-transform drop-shadow" />
                              <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/20 transition-all" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-sm text-slate-200 group-hover:text-primary transition-colors">
                                {video.title}
                              </h4>
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {video.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap">
                            {getCategoryLabel(video.category)}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-center font-mono text-xs font-semibold text-slate-300">
                          {video.duration || "—"}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleToggleActive(video)}
                              className={`p-1.5 rounded-full border transition-all ${
                                video.is_active
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                  : "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700"
                              }`}
                              title={video.is_active ? "Aktywne (kliknij, aby ukryć)" : "Ukryte (kliknij, aby pokazać)"}
                            >
                              {video.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(video)}
                              className="h-8 w-8 p-0 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                              title="Edytuj"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(video)}
                              className="h-8 w-8 p-0 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                              title="Usuń"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit / Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !isSubmitting && setIsDialogOpen(open)}>
        <DialogContent className="sm:max-w-[500px] glass border-white/10 bg-slate-950/95 text-slate-100 rounded-2xl shadow-2xl backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                {editingVideo ? "Edytuj Poradnik Wideo" : "Dodaj Nowy Poradnik Wideo"}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                {editingVideo 
                  ? "Zmień metadane filmu. Aby zachować obecny plik wideo, pozostaw pole pliku puste."
                  : "Wypełnij formularz i wybierz plik .mp4 z dysku, aby dodać nowy film do Centrum Pomocy."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold text-slate-300">Tytuł filmu <span className="text-red-400">*</span></Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="np. Jak wygenerować etykietę kurierską"
                  className="glass border-white/10 bg-slate-900/60 focus:border-primary/50 text-slate-100 placeholder-slate-500 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold text-slate-300">Krótki opis <span className="text-red-400">*</span></Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Wyjaśnij pokrótce czego dotyczy ten film instruktażowy..."
                  className="glass border-white/10 bg-slate-900/60 focus:border-primary/50 text-slate-100 placeholder-slate-500 rounded-xl min-h-[80px]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-bold text-slate-300">Kategoria <span className="text-red-400">*</span></Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="glass border-white/10 bg-slate-900/60 focus:border-primary/50 text-slate-100 rounded-xl">
                      <SelectValue placeholder="Wybierz kategorię" />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/10 bg-slate-950/95 text-slate-100">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="focus:bg-primary/20 focus:text-white">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="duration" className="text-xs font-bold text-slate-300">Czas trwania (np. 1:45)</Label>
                  <Input
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="np. 2:10"
                    className="glass border-white/10 bg-slate-900/60 focus:border-primary/50 text-slate-100 placeholder-slate-500 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">
                  Plik wideo (.mp4, .mov, .webm) {!editingVideo && <span className="text-red-400">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="file"
                    type="file"
                    accept="video/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Label
                    htmlFor="file"
                    className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-primary/40 bg-slate-900/30 hover:bg-slate-900/50 rounded-xl p-6 cursor-pointer transition-all gap-2"
                  >
                    <FileVideo className="h-7 w-7 text-slate-500 group-hover:text-primary" />
                    <span className="text-xs font-semibold text-slate-300">
                      {selectedFile ? selectedFile.name : "Wybierz plik z dysku..."}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "Formaty: MP4, MOV, WebM (maks. 100MB)"}
                    </span>
                  </Label>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="text-xs font-bold text-slate-300">Widoczny dla pracowników</Label>
                  <p className="text-[10px] text-slate-500">Jeśli wyłączysz, film nie będzie widoczny na stronie pomocy.</p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-white/5 pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
                className="hover:bg-white/5 text-slate-400 hover:text-white rounded-xl"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/10 min-w-[100px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Zapisywanie...
                  </>
                ) : (
                  "Zapisz"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideoUrl} onOpenChange={(open) => !open && setPreviewVideoUrl(null)}>
        <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden border border-white/10 bg-black rounded-2xl shadow-2xl">
          <div className="relative aspect-video bg-black flex items-center justify-center">
            {previewVideoUrl && (
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
