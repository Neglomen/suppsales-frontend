"use client";

import { useState } from "react";
import api, { getMediaUrl } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  Camera,
  Trash,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface UnidentifiedFormProps {
  initialWaybill: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UnidentifiedForm({ initialWaybill, onSuccess, onCancel }: UnidentifiedFormProps) {
  const [waybill, setWaybill] = useState(initialWaybill);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      
      try {
        const response = await api.post<{ url: string }>("/returns/upload-photo", formData);
        uploadedUrls.push(response.data.url);
      } catch (err) {
        toast.error(`Błąd wczytywania zdjęcia: ${files[i].name}`);
      }
    }

    setPhotos((prev) => [...prev, ...uploadedUrls]);
    setIsUploading(false);
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit anonymous return
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waybill.trim()) {
      toast.error("Wprowadź numer listu przewozowego.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/returns/unidentified", {
        waybill_number: waybill.trim(),
        warehouse_notes: notes.trim(),
        photos: photos
      });
      toast.success("Paczka została przyjęta jako niezidentyfikowana (Mystery Box)!");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Nie udało się zapisać paczki.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl">
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-500 font-mono pb-2 border-b border-slate-200 dark:border-white/5">
            <AlertTriangle className="h-4 w-4" />
            <span>Rejestracja paczki niezidentyfikowanej</span>
          </div>

          <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed bg-amber-50 dark:bg-yellow-500/5 border border-amber-200 dark:border-yellow-500/10 p-3 rounded-xl">
            Nie znaleziono w bazie zamówienia powiązanego z tym kodem. Zarejestruj paczkę, wykonaj jej zdjęcie, a BOK dopasuje ją później.
          </div>

          {/* 1. Waybill number */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Numer listu przewozowego</label>
            <Input
              value={waybill}
              onChange={(e) => setWaybill(e.target.value)}
              placeholder="Zeskanuj lub wpisz numer listu..."
              className="bg-slate-50 dark:bg-black/25 border-slate-200 dark:border-white/10 rounded-xl focus:border-yellow-500 text-xs font-mono text-foreground placeholder:text-muted-foreground/45 h-10"
              required
            />
          </div>

          {/* 2. Photo capture */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Zdjęcie paczki / zawartości</label>
            <div className="flex flex-wrap gap-2.5">
              {photos.map((url, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 group">
                  <img src={getMediaUrl(url)} alt="Return photo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash className="h-4 w-4 text-rose-400" />
                  </button>
                </div>
              ))}

              <label className={cn(
                "w-16 h-16 rounded-xl border border-dashed border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white/40 bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-white/10",
                isUploading && "opacity-50 pointer-events-none"
              )}>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[8px] text-muted-foreground mt-1 font-bold">Aparat</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 3. Description notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Uwagi / zawartość paczki</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opisz co jest w środku, np. 'czarna mikrofalówka, brak dokumentów, nadawca Jan Kowalski'..."
              rows={3}
              className="bg-slate-50 dark:bg-black/25 border-slate-200 dark:border-white/10 text-xs rounded-xl focus:border-yellow-500 resize-none placeholder:text-muted-foreground/45 text-foreground"
            />
          </div>

          {/* 4. Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="flex-1 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !waybill.trim()}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl text-xs shadow-md shadow-yellow-500/10"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Zapisz jako Mystery Box"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
