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
  ChevronRight,
  History,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TemplateFormDialog,
  type Template,
  type Variant,
} from "./_components/template-form-dialog";
import { SendEmailDialog } from "@/components/shared/send-email-dialog";
import { TemplateToolbar } from "./_components/template-toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// --- Komponent Karty z Przełącznikiem Wariantów (bez zmian) ---
const TemplateCard = ({
  template,
  onEdit,
  onDelete,
  onCopy,
  onSend,
}: {
  template: Template;
  onEdit: (template: Template | Variant) => void;
  onDelete: (template: Template | Variant) => void;
  onCopy: (template: Template | Variant) => void;
  onSend: (template: Template | Variant) => void;
}) => {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  const allVersions = useMemo(
    () => [template, ...(template.variants || [])],
    [template]
  );
  const currentTemplate = allVersions[activeVariantIndex];

  const cycleVariant = (direction: "next" | "prev") => {
    setActiveVariantIndex((prev) => {
      const newIndex = direction === "next" ? prev + 1 : prev - 1;
      if (newIndex >= allVersions.length) return 0;
      if (newIndex < 0) return allVersions.length - 1;
      return newIndex;
    });
  };

  return (
    <Card className="flex flex-col transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-start justify-between">
          <span className="truncate pr-2 font-semibold">
            {currentTemplate.title}
          </span>
          <Badge
            variant={
              currentTemplate.scope === "organization" ? "outline" : "secondary"
            }
            className="flex-shrink-0"
          >
            {currentTemplate.scope === "organization" ? (
              <Users className="mr-1 h-3 w-3" />
            ) : (
              <Lock className="mr-1 h-3 w-3" />
            )}
            {currentTemplate.scope === "organization"
              ? "Organizacja"
              : "Prywatny"}
          </Badge>
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-1 pt-2 min-h-[26px]">
          {currentTemplate.tags?.map((tag) => (
            <Badge key={tag.id} variant="secondary">
              {tag.name}
            </Badge>
          ))}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div
          className="prose prose-sm dark:prose-invert text-muted-foreground line-clamp-4"
          dangerouslySetInnerHTML={{ __html: currentTemplate.content }}
        />
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-muted/50 p-2">
        {allVersions.length > 1 ? (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => cycleVariant("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground font-mono">
              {activeVariantIndex + 1} / {allVersions.length}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => cycleVariant("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onCopy(currentTemplate)}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Kopiuj treść</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSend(currentTemplate)}
                  className="h-8 w-8"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Wyślij</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(currentTemplate)}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edytuj</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(currentTemplate)}
                  className="text-destructive hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Usuń</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
};

export default function ResponseTemplatesPage() {
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isSendOpen, setSendOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<
    Template | Variant | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<
    Template | Variant | null
  >(null);

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

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return allTemplates;
    const lowercasedQuery = searchQuery.toLowerCase();
    return allTemplates.filter(
      (template) =>
        template.title.toLowerCase().includes(lowercasedQuery) ||
        template.tags?.some((tag) =>
          tag.name.toLowerCase().includes(lowercasedQuery)
        ) ||
        template.variants?.some((variant) =>
          variant.title.toLowerCase().includes(lowercasedQuery)
        )
    );
  }, [allTemplates, searchQuery]);

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
          setDeleteDialogOpen(false);
          return "Szablon usunięty pomyślnie.";
        },
        error: (err) =>
          err.response?.data?.detail || "Nie udało się usunąć szablonu.",
      }
    );
  };

  const handleCopy = (template: Template | Variant) => {
    const plainText =
      new DOMParser().parseFromString(template.content, "text/html")
        .documentElement.textContent || "";
    navigator.clipboard.writeText(plainText);
    toast.success("Treść szablonu skopiowana do schowka!");
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Szablony i Komunikacja</h1>
          <p className="text-muted-foreground">
            Zarządzaj szablonami i przeglądaj historię wysłanych wiadomości.
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">
            <LayoutTemplate className="mr-2 h-4 w-4" /> Szablony Odpowiedzi
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" /> Historia Wszystkich Wysyłek
          </TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="mt-6">
          <TemplateToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onAddClick={() => {
              setActiveTemplate(null);
              setFormOpen(true);
            }}
          />

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg mt-4">
              <h3 className="text-lg font-semibold">
                {searchQuery ? "Brak pasujących szablonów" : "Brak szablonów"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Spróbuj zmienić frazę wyszukiwania."
                  : "Nie masz jeszcze żadnych gotowych odpowiedzi."}
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setActiveTemplate(null);
                  setFormOpen(true);
                }}
              >
                Stwórz swój pierwszy szablon
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  onCopy={handleCopy}
                  onSend={openSendDialog}
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <AllCommunicationLogsTab />
        </TabsContent>
      </Tabs>

      <TemplateFormDialog
        isOpen={isFormOpen}
        setIsOpen={setFormOpen}
        onSuccess={handleSuccess}
        template={activeTemplate as Template | null}
        parentTemplates={allTemplates}
      />

      {activeTemplate && (
        <SendEmailDialog
          isOpen={isSendOpen}
          setIsOpen={setSendOpen}
          // === POPRAWKA: Zmieniamy `templateToEdit` na `template` ===
          template={activeTemplate}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć szablon?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tej akcji nie można cofnąć. Szablon "
              <strong>{templateToDelete?.title}</strong>" zostanie trwale
              usunięty.
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
