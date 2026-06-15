// src/app/(dashboard)/response-templates/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  Copy,
  Send,
  Users,
  Lock,
  Edit,
  Trash2,
  ChevronLeft,
  History,
  LayoutTemplate,
  PlusCircle,
  Search,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  TemplateFormDialog,
  type Template,
  type Variant,
} from "./_components/template-form-dialog";
import { SendEmailDialog } from "@/components/shared/send-email-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllCommunicationLogsTab } from "./_components/all-communication-logs-tab";
import { motion, AnimatePresence } from "framer-motion";

export default function ResponseTemplatesPage() {
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isSendOpen, setSendOpen] = useState(false);
  
  // Dialog edycji/tworzenia szablonów używa tej zmiennej stanu
  const [activeTemplate, setActiveTemplate] = useState<Template | Variant | null>(null);
  
  // Wybrany szablon nadrzędny w widoku Master-Detail
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  
  // Filtry wyszukiwania, widoczności (scope) oraz tagów
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "organization" | "private">("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  
  // Widok mobilny ("list" lub "detail")
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  
  // Dane testowe zmiennych w locie
  const [mockValues, setMockValues] = useState({
    customer_name: "Jan Kowalski",
    customer_email: "jan.kowalski@example.com",
    order_id_external: "BL-2026-9876",
    tracking_number: "PL123456789DH",
  });
  
  // Status kopiowania z efektem visual feedback
  const [copied, setCopied] = useState(false);

  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | Variant | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<Template[]>("/response-templates");
      setAllTemplates(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać listy szablonów.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Automatyczny wybór pierwszego szablonu po załadowaniu
  useEffect(() => {
    if (allTemplates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(allTemplates[0]);
      setSelectedVariantId(allTemplates[0].id);
    }
  }, [allTemplates, selectedTemplate]);

  // Wyciąganie wszystkich unikalnych tagów z szablonów do pigułek filtrujących
  const allTags = useMemo(() => {
    const tagsMap: { [key: string]: number } = {};
    allTemplates.forEach((t) => {
      t.tags?.forEach((tag) => {
        tagsMap[tag.name] = (tagsMap[tag.name] || 0) + 1;
      });
      t.variants?.forEach((v) => {
        v.tags?.forEach((tag) => {
          tagsMap[tag.name] = (tagsMap[tag.name] || 0) + 1;
        });
      });
    });
    return Object.entries(tagsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allTemplates]);

  // Filtrowanie listy szablonów na podstawie wyszukiwania, scope'u oraz tagów
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((template) => {
      // 1. Wyszukiwanie frazy
      const lowercasedQuery = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        template.title.toLowerCase().includes(lowercasedQuery) ||
        template.tags?.some((tag) => tag.name.toLowerCase().includes(lowercasedQuery)) ||
        template.variants?.some((variant) => variant.title.toLowerCase().includes(lowercasedQuery));

      // 2. Filtrowanie po widoczności
      const matchesScope = scopeFilter === "all" || template.scope === scopeFilter;

      // 3. Filtrowanie po tagach
      const matchesTag =
        !selectedTagFilter ||
        template.tags?.some((tag) => tag.name === selectedTagFilter) ||
        template.variants?.some((variant) => variant.tags?.some((tag) => tag.name === selectedTagFilter));

      return matchesSearch && matchesScope && matchesTag;
    });
  }, [allTemplates, searchQuery, scopeFilter, selectedTagFilter]);

  // Aktywna wersja wybranego szablonu (rodzic lub wariant)
  const activeVersion = useMemo(() => {
    if (!selectedTemplate) return null;
    if (selectedVariantId === selectedTemplate.id) return selectedTemplate;
    return selectedTemplate.variants?.find((v) => v.id === selectedVariantId) || selectedTemplate;
  }, [selectedTemplate, selectedVariantId]);

  // Wszystkie wersje aktualnego szablonu (główny + warianty)
  const allVersions = useMemo(() => {
    if (!selectedTemplate) return [];
    return [selectedTemplate, ...(selectedTemplate.variants || [])];
  }, [selectedTemplate]);

  // Funkcja renderująca interaktywne zmienne w locie w kodzie HTML szablonu
  const renderDemoPreview = (content: string) => {
    if (!content) return "";
    let rendered = content;
    rendered = rendered.replace(
      /{{\s*customer_name\s*}}/g,
      `<strong class="text-primary font-semibold border-b border-primary/20 bg-primary/5 px-1 rounded">${mockValues.customer_name}</strong>`
    );
    rendered = rendered.replace(
      /{{\s*customer_email\s*}}/g,
      `<strong class="text-primary font-semibold border-b border-primary/20 bg-primary/5 px-1 rounded">${mockValues.customer_email}</strong>`
    );
    rendered = rendered.replace(
      /{{\s*order_id_external\s*}}/g,
      `<strong class="text-primary font-semibold border-b border-primary/20 bg-primary/5 px-1 rounded">${mockValues.order_id_external}</strong>`
    );
    rendered = rendered.replace(
      /{{\s*tracking_number\s*}}/g,
      `<strong class="text-primary font-semibold border-b border-primary/20 bg-primary/5 px-1 rounded">${mockValues.tracking_number}</strong>`
    );
    return rendered;
  };

  const handleSuccess = () => {
    fetchTemplates();
    setActiveTemplate(null);
    setFormOpen(false);
  };

  const openDeleteDialog = (template: Template | Variant) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    await toast.promise(
      api.delete(`/response-templates/${templateToDelete.id}`),
      {
        loading: "Usuwanie szablonu...",
        success: () => {
          fetchTemplates();
          // Reset wybranego szablonu jeśli usunęliśmy główny
          if (selectedTemplate?.id === templateToDelete.id) {
            setSelectedTemplate(null);
          }
          setDeleteDialogOpen(false);
          return "Szablon usunięty pomyślnie.";
        },
        error: (err) =>
          err.response?.data?.detail || "Nie udało się usunąć szablonu.",
      }
    );
  };

  const handleCopy = (version: Template | Variant) => {
    const plainText =
      new DOMParser().parseFromString(version.content, "text/html")
        .documentElement.textContent || "";
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    toast.success("Treść szablonu skopiowana do schowka!");
    setTimeout(() => setCopied(false), 2000);
  };

  const openSendDialog = (template: Template | Variant) => {
    setActiveTemplate(template);
    setSendOpen(true);
  };

  const openEditDialog = (template: Template | Variant) => {
    setActiveTemplate(template as Template);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Szablony i Komunikacja
          </h1>
          <p className="text-muted-foreground mt-1">
            Zarządzaj szablonami i przeglądaj historię wysłanych wiadomości.
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="templates">
            <LayoutTemplate className="mr-2 h-4 w-4" /> Szablony Odpowiedzi
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" /> Historia Wszystkich Wysyłek
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          {allTemplates.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed rounded-2xl bg-card">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <LayoutTemplate className="h-10 w-10" />
                </div>
              </div>
              <h3 className="text-xl font-bold">Brak szablonów odpowiedzi</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                Nie masz jeszcze żadnych gotowych szablonów. Kliknij przycisk poniżej, aby stworzyć swój pierwszy szablon.
              </p>
              <Button
                className="mt-6"
                onClick={() => {
                  setActiveTemplate(null);
                  setFormOpen(true);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Stwórz swój pierwszy szablon
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-16rem)] min-h-[600px] items-stretch">
              
              {/* --- LEWY PANEL: LISTA SZABLONÓW --- */}
              <div
                className={cn(
                  "col-span-1 md:col-span-4 flex flex-col gap-4 overflow-hidden h-full md:border-r border-muted-foreground/10 md:pr-6 pb-4",
                  mobileView === "detail" ? "hidden md:flex" : "flex"
                )}
              >
                {/* Wyszukiwanie i przycisk Dodaj */}
                <div className="flex gap-2 items-center shrink-0">
                  <div className="relative flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj po tytule lub tagu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setActiveTemplate(null);
                      setFormOpen(true);
                    }}
                    size="sm"
                    className="h-9 shrink-0"
                  >
                    <PlusCircle className="mr-1.5 h-4 w-4" /> Dodaj
                  </Button>
                </div>

                {/* Filtry Widoczności (Scope) */}
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1 text-[11px] font-semibold shrink-0">
                  {(["all", "organization", "private"] as const).map((scope) => (
                    <button
                      key={scope}
                      onClick={() => setScopeFilter(scope)}
                      className={cn(
                        "py-1.5 px-2 rounded-md text-center transition-all shrink-0",
                        scopeFilter === scope
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {scope === "all"
                        ? "Wszystkie"
                        : scope === "organization"
                        ? "Firma"
                        : "Prywatne"}
                    </button>
                  ))}
                </div>

                {/* Filtry po Tagach */}
                {allTags.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none border-b shrink-0">
                    <button
                      onClick={() => setSelectedTagFilter(null)}
                      className={cn(
                        "px-2.5 py-1 text-[10px] rounded-full font-medium transition-all shrink-0 border",
                        selectedTagFilter === null
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground border-transparent"
                      )}
                    >
                      Wszystkie tagi
                    </button>
                    {allTags.map((tag) => (
                      <button
                        key={tag.name}
                        onClick={() =>
                          setSelectedTagFilter(selectedTagFilter === tag.name ? null : tag.name)
                        }
                        className={cn(
                          "px-2.5 py-1 text-[10px] rounded-full font-medium transition-all shrink-0 flex items-center gap-1 border",
                          selectedTagFilter === tag.name
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground border-transparent"
                        )}
                      >
                        <span>#{tag.name}</span>
                        <span className="opacity-60 text-[8px] px-1 bg-background/50 rounded font-mono">
                          {tag.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Lista elementów */}
                <div className="flex-grow overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">Brak pasujących szablonów.</p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setScopeFilter("all");
                          setSelectedTagFilter(null);
                        }}
                        className="text-xs text-primary font-medium hover:underline mt-2"
                      >
                        Wyczyść filtry
                      </button>
                    </div>
                  ) : (
                    filteredTemplates.map((template) => {
                      const isSelected = selectedTemplate?.id === template.id;
                      const totalVariants = template.variants?.length || 0;
                      return (
                        <div
                          key={template.id}
                          onClick={() => {
                            setSelectedTemplate(template);
                            setSelectedVariantId(template.id);
                            setMobileView("detail");
                          }}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 text-left relative",
                            isSelected
                              ? "bg-primary/5 border-primary/50 shadow-sm"
                              : "hover:bg-muted/30 border-muted-foreground/10 bg-card"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "font-semibold text-sm truncate",
                                isSelected ? "text-primary" : "text-foreground"
                              )}
                            >
                              {template.title}
                            </span>
                            <span className="text-muted-foreground/60 shrink-0 mt-0.5">
                              {template.scope === "organization" ? (
                                <Users className="h-3.5 w-3.5" />
                              ) : (
                                <Lock className="h-3.5 w-3.5" />
                              )}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {template.tags?.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="secondary"
                                className="text-[9px] py-0 px-1.5 font-normal bg-muted text-muted-foreground"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {template.tags && template.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground font-mono self-center">
                                +{template.tags.length - 3}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-2 border-t border-dashed border-muted mt-1">
                            <span>
                              {template.scope === "organization" ? "Firma" : "Prywatny"}
                            </span>
                            {totalVariants > 0 && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] py-0 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none font-semibold hover:bg-blue-500/15"
                              >
                                +{totalVariants} {totalVariants === 1 ? "wariant" : "warianty"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* --- PRAWY PANEL: SZCZEGÓŁY / OBSZAR ROBOCZY --- */}
              <div
                className={cn(
                  "col-span-1 md:col-span-8 overflow-hidden h-full flex flex-col relative md:pl-2 pb-4",
                  mobileView === "list" ? "hidden md:flex" : "flex"
                )}
              >
                {activeVersion ? (
                  <div className="flex flex-col h-full overflow-hidden">
                    
                    {/* Header Panelu Details */}
                    <div className="pb-4 border-b space-y-2 shrink-0">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="md:hidden h-8 w-8 text-muted-foreground"
                          onClick={() => setMobileView("list")}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="text-lg font-bold truncate flex-grow">
                          {activeVersion.title}
                        </h2>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={
                              activeVersion.scope === "organization" ? "outline" : "secondary"
                            }
                            className={cn(
                              "text-xs px-2 py-0.5",
                              activeVersion.scope === "organization" &&
                                "border-primary/20 text-primary bg-primary/5"
                            )}
                          >
                            {activeVersion.scope === "organization" ? (
                              <>
                                <Users className="mr-1 h-3 w-3" /> Firma
                              </>
                            ) : (
                              <>
                                <Lock className="mr-1 h-3 w-3" /> Prywatny
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>

                      {/* Tagi aktywnego wariantu */}
                      {activeVersion.tags && activeVersion.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {activeVersion.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="text-[10px] font-normal bg-muted hover:bg-muted text-muted-foreground"
                            >
                              #{tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Przełącznik Wariantów jako estetyczne zakładki (jeśli istnieją) */}
                    {allVersions.length > 1 && (
                      <div className="py-2.5 border-b flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                        {allVersions.map((version, index) => (
                          <button
                            key={version.id}
                            onClick={() => setSelectedVariantId(version.id)}
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border shrink-0 flex items-center gap-1.5",
                              selectedVariantId === version.id
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-card hover:bg-muted text-muted-foreground border-muted"
                            )}
                          >
                            <span>{version.title}</span>
                            {index === 0 && (
                              <span className="text-[9px] uppercase px-1 bg-background/25 rounded font-mono opacity-80">
                                Główny
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Szybkie Akcje */}
                    <div className="flex items-center justify-between py-3 border-b shrink-0">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => openSendDialog(activeVersion)}
                          className="gap-1.5 text-xs font-medium"
                        >
                          <Send className="h-3.5 w-3.5" /> Wyślij e-mail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(activeVersion)}
                          className="gap-1.5 text-xs font-medium"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copied ? "Skopiowano!" : "Kopiuj"}
                        </Button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(activeVersion)}
                          className="h-8 w-8"
                          title="Edytuj szablon"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openDeleteDialog(activeVersion)}
                          className="h-8 w-8 hover:bg-destructive/10"
                          title="Usuń szablon"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Obszar Roboczy: Podgląd E-maila oraz Sandbox zmiennych */}
                    <div className="flex-grow overflow-y-auto py-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
                      
                      {/* Wizualny Podgląd E-maila */}
                      <div className="xl:col-span-8 flex flex-col gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Podgląd wiadomości e-mail
                        </span>
                        <div className="border rounded-xl shadow-sm bg-card overflow-hidden flex flex-col h-full min-h-[350px]">
                          {/* Koperta / Nagłówki */}
                          <div className="bg-muted/40 p-4 border-b space-y-1.5 text-xs text-muted-foreground/80 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="w-12 font-semibold text-right">Od:</span>
                              <span className="bg-background px-2 py-0.5 rounded border text-foreground">
                                kontakt@firma.pl (Domyślne)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12 font-semibold text-right">Do:</span>
                              <span className="bg-background px-2 py-0.5 rounded border text-foreground italic">
                                {mockValues.customer_email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12 font-semibold text-right">Temat:</span>
                              <span className="bg-background px-2 py-0.5 rounded border text-foreground font-semibold">
                                {renderDemoPreview(activeVersion.title)}
                              </span>
                            </div>
                          </div>
                          {/* Ciało E-maila */}
                          <div className="p-6 bg-background dark:bg-zinc-950 flex-grow overflow-y-auto">
                            <div
                              className="prose prose-sm dark:prose-invert prose-blue max-w-none break-words"
                              dangerouslySetInnerHTML={{
                                __html: renderDemoPreview(activeVersion.content),
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Panel Boczny: Sandbox / Mockowanie Zmiennych */}
                      <div className="xl:col-span-4 flex flex-col gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Piaskownica testowa
                        </span>
                        <div className="border rounded-xl p-4 bg-card shadow-sm space-y-4 h-fit">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                            <span>Mockuj zmienne dynamiczne</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Zmieniaj testowe wartości zmiennych poniżej, aby na bieżąco sprawdzić dopasowanie treści szablonu.
                          </p>
                          <div className="space-y-3.5 pt-2">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                                <span>Imię klienta</span>
                                <code className="text-[10px] font-mono text-primary bg-primary/5 px-1 rounded">
                                  {"{{ customer_name }}"}
                                </code>
                              </label>
                              <Input
                                value={mockValues.customer_name}
                                onChange={(e) =>
                                  setMockValues((prev) => ({
                                    ...prev,
                                    customer_name: e.target.value,
                                  }))
                                }
                                className="h-9 text-xs"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                                <span>Email klienta</span>
                                <code className="text-[10px] font-mono text-primary bg-primary/5 px-1 rounded">
                                  {"{{ customer_email }}"}
                                </code>
                              </label>
                              <Input
                                value={mockValues.customer_email}
                                onChange={(e) =>
                                  setMockValues((prev) => ({
                                    ...prev,
                                    customer_email: e.target.value,
                                  }))
                                }
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                                <span>Numer zamówienia</span>
                                <code className="text-[10px] font-mono text-primary bg-primary/5 px-1 rounded">
                                  {"{{ order_id_external }}"}
                                </code>
                              </label>
                              <Input
                                value={mockValues.order_id_external}
                                onChange={(e) =>
                                  setMockValues((prev) => ({
                                    ...prev,
                                    order_id_external: e.target.value,
                                  }))
                                }
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                                <span>Numer przesyłki</span>
                                <code className="text-[10px] font-mono text-primary bg-primary/5 px-1 rounded">
                                  {"{{ tracking_number }}"}
                                </code>
                              </label>
                              <Input
                                value={mockValues.tracking_number}
                                onChange={(e) =>
                                  setMockValues((prev) => ({
                                    ...prev,
                                    tracking_number: e.target.value,
                                  }))
                                }
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                    <LayoutTemplate className="h-12 w-12 text-muted-foreground/35 mb-4 animate-bounce" />
                    <h3 className="text-lg font-semibold">Nie wybrano szablonu</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                      Wybierz jeden z szablonów z lewego panelu, aby zobaczyć szczegóły, warianty oraz przetestować zmienne.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <AllCommunicationLogsTab />
        </TabsContent>
      </Tabs>

      {/* Formularz Tworzenia i Edycji Szablonów */}
      <TemplateFormDialog
        isOpen={isFormOpen}
        setIsOpen={setFormOpen}
        onSuccess={handleSuccess}
        template={activeTemplate as Template | null}
        parentTemplates={allTemplates}
      />

      {/* Dialog Wysyłki E-mail */}
      {activeTemplate && (
        <SendEmailDialog
          isOpen={isSendOpen}
          setIsOpen={setSendOpen}
          template={activeTemplate as Template}
        />
      )}

      {/* Potwierdzenie Usunięcia */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć szablon?</AlertDialogTitle>
            <AlertDialogDescription>
              Tej akcji nie można cofnąć. Szablon "<strong>{templateToDelete?.title}</strong>" zostanie trwale usunięty ze wszystkimi wariantami, jeśli jest to szablon nadrzędny.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Tak, usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
