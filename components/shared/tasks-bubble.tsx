"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  ClipboardList, 
  X, 
  Loader2, 
  Send, 
  Plus, 
  User as UserIcon,
  MessageSquare, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-hot-toast";
import api, { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type: "STANDARD" | "DECISION_REQUEST";
  created_by_id: string;
  created_by: { id: string; name?: string; email: string };
  assigned_to_id?: string;
  assigned_to?: { id: string; name?: string; email: string };
  due_date?: string;
  order_id?: string;
  thread_id?: string;
  is_read_by_creator: boolean;
  is_read_by_assignee: boolean;
  is_replied: boolean;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
}

export function TasksBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetails, setTaskDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  
  // Stan formularza nowego zadania
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [newType, setNewType] = useState<"STANDARD" | "DECISION_REQUEST">("STANDARD");
  const [newAssigneeId, setNewAssigneeId] = useState<string>("none");
  const [newDueDate, setNewDueDate] = useState("");
  const [linkToOrder, setLinkToOrder] = useState(true);
  const [linkToThread, setLinkToThread] = useState(true);
  const [showAllZlecone, setShowAllZlecone] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("Problem z zamówieniem");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [eventOrderId, setEventOrderId] = useState<string | null>(null);
  const [eventThreadId, setEventThreadId] = useState<string | null>(null);
  const [activeFulfillmentOrder, setActiveFulfillmentOrder] = useState<any>(null);
  
  // Stan nowego komentarza
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Licznik nieodczytanych powiadomień/zadań
  const [badgeCount, setBadgeCount] = useState(0);

  // Pomocnicze funkcje do obsługi statusu przeczytania zadań dla "każdego" (unassigned)
  const isUnassignedTaskRead = (taskId: string) => {
    if (typeof window === "undefined") return true;
    try {
      const readList = JSON.parse(localStorage.getItem("read_unassigned_tasks") || "[]");
      return readList.includes(taskId);
    } catch {
      return false;
    }
  };

  const markUnassignedTaskAsRead = (taskId: string) => {
    if (typeof window === "undefined") return;
    try {
      const readList = JSON.parse(localStorage.getItem("read_unassigned_tasks") || "[]");
      if (!readList.includes(taskId)) {
        readList.push(taskId);
        localStorage.setItem("read_unassigned_tasks", JSON.stringify(readList));
      }
    } catch {
      // ignore
    }
  };

  // Pobierz zadania i członków organizacji
  const fetchTasksData = async () => {
    if (!user) return;
    try {
      // Pobieramy wszystkie zadania bez filtrów po użytkowniku (filtrujemy po stronie klienta)
      const res = await api.get("/internal-tasks/?size=100");
      const fetchedTasks: Task[] = res.data.items || [];
      setTasks(fetchedTasks);

      // Obliczanie badge count
      const count = fetchedTasks.filter(t => {
        const isCreatorUnread = t.created_by_id === user.id && !t.is_read_by_creator;
        
        let isAssigneeUnread = false;
        let isPendingDecision = false;
        
        if (t.assigned_to_id === user.id) {
          isAssigneeUnread = !t.is_read_by_assignee;
          isPendingDecision = t.type === "DECISION_REQUEST" && t.status !== "CLOSED" && t.status !== "RESOLVED";
        } else if (!t.assigned_to_id) {
          // Task dla każdego (unassigned)
          const isCreator = t.created_by_id === user.id;
          const isClosed = t.status === "CLOSED" || t.status === "RESOLVED";
          isAssigneeUnread = !isCreator && !isClosed && !isUnassignedTaskRead(t.id);
        }
        
        return (isCreatorUnread || isAssigneeUnread || isPendingDecision);
      }).length;
      
      setBadgeCount(count);
    } catch (err) {
      console.error("Błąd podczas pobierania zadań:", err);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get("/organization/members");
      setMembers(res.data || []);
    } catch (err) {
      console.error("Błąd pobierania członków organizacji:", err);
    }
  };

  useEffect(() => {
    fetchTasksData();
    fetchMembers();

    // Odpytywanie co 30 sekund
    const interval = setInterval(fetchTasksData, 30000);
  }, [user]);

  useEffect(() => {
    const handleOpenTaskEvent = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const taskId = customEvent.detail?.taskId;
      const orderId = customEvent.detail?.orderId;
      const threadId = customEvent.detail?.threadId;

      if (orderId) setEventOrderId(orderId);
      if (threadId) setEventThreadId(threadId);

      setIsOpen(true);

      if (taskId) {
        setIsDetailLoading(true);
        setSelectedTask({ id: taskId } as any); // tymczasowe ustawienie
        try {
          const res = await api.get(`/internal-tasks/${taskId}`);
          setSelectedTask(res.data);
          setTaskDetails(res.data);
        } catch (err) {
          toast.error("Nie udało się otworzyć szczegółów zadania.");
          setSelectedTask(null);
          setTaskDetails(null);
        } finally {
          setIsDetailLoading(false);
        }
      } else {
        setIsCreating(true);
        setSelectedTask(null);
        setTaskDetails(null);
      }
    };
    window.addEventListener("open-internal-task", handleOpenTaskEvent);
    return () => window.removeEventListener("open-internal-task", handleOpenTaskEvent);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setEventOrderId(null);
      setEventThreadId(null);
      setIsCreating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOrderChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveFulfillmentOrder(customEvent.detail?.order || null);
    };
    window.addEventListener("fulfillment-order-changed", handleOrderChange);
    
    // Initial load
    if (typeof window !== "undefined" && (window as any).__currentFulfillmentOrder) {
      setActiveFulfillmentOrder((window as any).__currentFulfillmentOrder);
    }

    return () => window.removeEventListener("fulfillment-order-changed", handleOrderChange);
  }, []);

  // Pobieranie szczegółów zadania
  const handleSelectTask = async (task: Task) => {
    setSelectedTask(task);
    setIsDetailLoading(true);
    try {
      if (!task.assigned_to_id) {
        markUnassignedTaskAsRead(task.id);
      }
      const res = await api.get(`/internal-tasks/${task.id}`);
      setTaskDetails(res.data);
      // Odświeżamy listę, aby zsynchronizować stan odczytania
      fetchTasksData();
    } catch (err) {
      toast.error("Nie udało się pobrać szczegółów zadania.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Dodawanie komentarza / podjęcie decyzji
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;

    setIsSubmittingComment(true);
    try {
      const res = await api.post(`/internal-tasks/${selectedTask.id}/comments`, {
        content: newComment.trim()
      });
      toast.success("Dodano odpowiedź / decyzję.");
      setNewComment("");
      
      // Odśwież szczegóły zadania
      const detailRes = await api.get(`/internal-tasks/${selectedTask.id}`);
      setTaskDetails(detailRes.data);
      fetchTasksData();
      window.dispatchEvent(new CustomEvent("refresh-tasks"));
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd dodawania komentarza.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Zamykanie zadania
  const handleCloseTask = async (status: "RESOLVED" | "CLOSED" | "IN_PROGRESS") => {
    if (!selectedTask) return;
    try {
      const res = await api.patch(`/internal-tasks/${selectedTask.id}`, {
        status: status
      });
      toast.success(`Zadanie oznaczono jako: ${status === "CLOSED" ? "Zamknięte" : status === "RESOLVED" ? "Rozwiązane" : "W toku"}`);
      
      // Odśwież szczegóły zadania
      const detailRes = await api.get(`/internal-tasks/${selectedTask.id}`);
      setTaskDetails(detailRes.data);
      fetchTasksData();
      window.dispatchEvent(new CustomEvent("refresh-tasks"));
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd podczas zmiany statusu.");
    }
  };

  // Tworzenie nowego zadania
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Temat jest wymagany.");
      return;
    }

    let orderId: string | undefined = undefined;
    let threadId: string | undefined = undefined;

    if (detectedOrder && linkToOrder) {
      orderId = detectedOrder.id;
    }

    if (detectedThread && linkToThread) {
      threadId = detectedThread.id;
    }

    const categoryPrefix = selectedCategory === "new" ? newCategoryName.trim() : selectedCategory;
    const formattedTitle = categoryPrefix ? `[${categoryPrefix}] ${newTitle.trim()}` : newTitle.trim();

    setIsLoading(true);
    try {
      await api.post("/internal-tasks/", {
        title: formattedTitle,
        description: newDesc.trim() || undefined,
        priority: newPriority,
        type: newType,
        assigned_to_id: (newAssigneeId && newAssigneeId !== "none") ? newAssigneeId : undefined,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        order_id: orderId,
        thread_id: threadId
      });

      toast.success("Zadanie zostało utworzone pomyślnie!");
      setIsCreating(false);
      
      // Reset formularza
      setNewTitle("");
      setNewDesc("");
      setNewPriority("MEDIUM");
      setNewType("STANDARD");
      setNewAssigneeId("none");
      setNewDueDate("");
      setLinkToOrder(true);
      setLinkToThread(true);
      setSelectedCategory("Problem z zamówieniem");
      setNewCategoryName("");

      fetchTasksData();
      window.dispatchEvent(new CustomEvent("refresh-tasks"));
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd podczas tworzenia zadania.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityBadge = (priority: Task["priority"]) => {
    switch (priority) {
      case "LOW": return <Badge variant="outline" className="border-slate-500/20 text-slate-500 dark:text-slate-400">Niski</Badge>;
      case "MEDIUM": return <Badge variant="outline" className="border-blue-500/20 text-blue-500">Średni</Badge>;
      case "HIGH": return <Badge variant="outline" className="border-orange-500/20 text-orange-500">Wysoki</Badge>;
      case "CRITICAL": return <Badge variant="outline" className="border-red-500/20 text-red-500 animate-pulse bg-red-500/5">Pilny</Badge>;
    }
  };

  const getStatusBadge = (status: Task["status"]) => {
    switch (status) {
      case "NEW": return <Badge className="bg-blue-500/10 text-blue-500 border-none hover:bg-blue-500/15">Nowe</Badge>;
      case "IN_PROGRESS": return <Badge className="bg-amber-500/10 text-amber-500 border-none hover:bg-amber-500/15">W toku</Badge>;
      case "RESOLVED": return <Badge className="bg-emerald-500/10 text-emerald-500 border-none hover:bg-emerald-500/15">Rozwiązane</Badge>;
      case "CLOSED": return <Badge className="bg-slate-500/10 text-slate-500 border-none hover:bg-slate-500/15">Zamknięte</Badge>;
    }
  };

  // Auto-detekcja aktywnego zamówienia
  const getDetectedOrder = () => {
    if (typeof window === "undefined") return null;

    // Case A: Przekazane przez zdarzenie custom event (np. przycisk "Dodaj zadanie")
    if (eventOrderId) {
      const label = activeFulfillmentOrder && activeFulfillmentOrder.id === eventOrderId
        ? `Zamówienie ${activeFulfillmentOrder.external_order_id || activeFulfillmentOrder.id.substring(0, 8)}`
        : `Zamówienie ${eventOrderId.substring(0, 8)}`;
      return { id: eventOrderId, label };
    }

    // Case B: Jesteśmy na podstronie pojedynczego zamówienia /orders/[id]
    if (pathname?.startsWith("/orders/")) {
      const parts = pathname.split("/");
      if (parts[2]) {
        return { id: parts[2], label: `Zamówienie ${parts[2].substring(0, 8)}` };
      }
    }

    // Case C: Jesteśmy na podstronie fulfillment, pobieramy aktywne zamówienie
    if (pathname === "/shipping/fulfillment" && activeFulfillmentOrder) {
      return {
        id: activeFulfillmentOrder.id,
        label: `Zamówienie ${activeFulfillmentOrder.external_order_id || activeFulfillmentOrder.id.substring(0, 8)}`
      };
    }

    return null;
  };

  const detectedOrder = getDetectedOrder();

  const getDetectedThread = () => {
    if (typeof window === "undefined") return null;

    if (eventThreadId) {
      return { id: eventThreadId, label: `Dyskusja/Wątek ${eventThreadId.substring(0, 8)}` };
    }

    if (pathname === "/communication") {
      const params = new URLSearchParams(window.location.search);
      const activeThreadId = params.get("thread") || params.get("thread_id");
      if (activeThreadId) {
        return { id: activeThreadId, label: `Dyskusja/Wątek ${activeThreadId.substring(0, 8)}` };
      }
    }

    return null;
  };

  const detectedThread = getDetectedThread();

  const parseTaskTitle = (fullTitle: string) => {
    const match = fullTitle.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      return { category: match[1], title: match[2] };
    }
    return { category: "Ogólne", title: fullTitle };
  };

  const allCategories = useMemo(() => {
    const cats = new Set<string>(["Problem z zamówieniem", "Reklamacja", "Zwrot", "Faktura / Płatność", "Inne"]);
    tasks.forEach(t => {
      const parsed = parseTaskTitle(t.title);
      if (parsed.category) {
        cats.add(parsed.category);
      }
    });
    return Array.from(cats);
  }, [tasks]);

  const filterTasks = (taskList: Task[]) => {
    return taskList.filter(t => {
      const parsed = parseTaskTitle(t.title);
      const matchesCategory = filterCategory === "all" || parsed.category === filterCategory;
      const matchesSearch = 
        parsed.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        parsed.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  // Filtrowanie zadań dla zakładek
  const assignedToMe = user ? tasks.filter(t => (t.assigned_to_id === user.id || !t.assigned_to_id) && t.status !== "CLOSED") : [];
  const createdByMe = user ? tasks.filter(t => t.created_by_id === user.id) : [];
  const feedbackNeeded = user ? tasks.filter(t => t.created_by_id === user.id && t.is_replied && !t.is_read_by_creator) : [];

  const twoWeeksAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d;
  }, []);

  const createdByMeFilteredByDate = useMemo(() => {
    if (showAllZlecone) return createdByMe;
    return createdByMe.filter(t => new Date(t.created_at) >= twoWeeksAgo);
  }, [createdByMe, showAllZlecone, twoWeeksAgo]);

  const filteredTodo = filterTasks(assignedToMe);
  const filteredFeedback = filterTasks(feedbackNeeded);
  const filteredCreated = filterTasks(createdByMeFilteredByDate);

  if (!user) return null;

  return (
    <>
      {/* Pływający dymek w prawym rogu ekranu */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <Button
            onClick={() => {
              setIsOpen(true);
              fetchTasksData();
            }}
            className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg hover:shadow-indigo-500/20 hover:shadow-xl transition-all duration-300 ring-2 ring-indigo-500/20"
            size="icon"
          >
            <ClipboardList className="h-5.5 w-5.5" />
          </Button>

          {badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white animate-bounce shadow-md">
              {badgeCount}
            </span>
          )}
        </motion.div>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent hideCloseButton={true} className="w-full sm:max-w-[480px] p-0 border-l border-slate-200 dark:border-border/10 glass flex flex-col h-full overflow-hidden">
          <SheetHeader className="p-6 border-b border-slate-200 dark:border-border/10">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-500" />
                Zadania i Decyzje
              </SheetTitle>
              <div className="flex items-center gap-2">
                {!isCreating && !selectedTask && (
                  <Button 
                    onClick={() => setIsCreating(true)}
                    size="sm" 
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 h-8 text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Nowe zadanie
                  </Button>
                )}
                <SheetClose asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Zamknij</span>
                  </Button>
                </SheetClose>
              </div>
            </div>
            <SheetDescription className="text-xs text-muted-foreground">
              Zarządzaj zadaniami wewnętrznymi, pytaj o decyzje oraz wymieniaj notatki.
            </SheetDescription>
          </SheetHeader>

          {!isCreating && !selectedTask && (
            <div className="p-4 border-b border-slate-200 dark:border-border/10 bg-slate-100/50 dark:bg-slate-950/20 flex flex-col sm:flex-row gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj zadań..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 rounded-lg border-slate-200 dark:border-border/40 text-xs focus-visible:ring-indigo-500 bg-white dark:bg-slate-950/40 text-foreground placeholder-muted-foreground dark:placeholder-slate-500"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs rounded-lg border-slate-200 dark:border-border/40 bg-white dark:bg-slate-950/40 text-foreground">
                  <SelectValue placeholder="Kategoria" />
                </SelectTrigger>
                <SelectContent className="glass border-border/10 text-xs">
                  <SelectItem value="all">Wszystkie kategorie</SelectItem>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-0">
            {isCreating ? (
              /* FORMULARZ TWORZENIA ZADANIA */
              <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Utwórz nowe zadanie</h3>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsCreating(false)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Wróć
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Temat / Pytanie</label>
                  <Input 
                    placeholder="np. Zmiana adresu dostawy w zamówieniu" 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)} 
                    required 
                    className="rounded-lg border-border/40 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Kategoria</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="rounded-lg border-border/40">
                      <SelectValue placeholder="Wybierz kategorię" />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/10 text-xs">
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      <SelectItem value="new">+ Nowa kategoria...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedCategory === "new" && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-xs font-semibold text-muted-foreground">Nazwa nowej kategorii</label>
                    <Input 
                      placeholder="np. Błąd krytyczny" 
                      value={newCategoryName} 
                      onChange={e => setNewCategoryName(e.target.value)} 
                      required 
                      className="rounded-lg border-border/40 focus-visible:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Opis (szczegóły / treść pytania)</label>
                  <Textarea 
                    placeholder="Opisz sprawę..." 
                    value={newDesc} 
                    onChange={e => setNewDesc(e.target.value)}
                    rows={4}
                    className="rounded-lg border-border/40 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Typ zadania</label>
                    <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                      <SelectTrigger className="rounded-lg border-border/40">
                        <SelectValue placeholder="Wybierz typ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STANDARD">Zwykłe zadanie</SelectItem>
                        <SelectItem value="DECISION_REQUEST">Prośba o decyzję</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Priorytet</label>
                    <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                      <SelectTrigger className="rounded-lg border-border/40">
                        <SelectValue placeholder="Priorytet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Niski</SelectItem>
                        <SelectItem value="MEDIUM">Średni</SelectItem>
                        <SelectItem value="HIGH">Wysoki</SelectItem>
                        <SelectItem value="CRITICAL">Pilny (Critical)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Osoba przypisana (Podejmująca decyzję)</label>
                  <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
                    <SelectTrigger className="rounded-lg border-border/40">
                      <SelectValue placeholder="Przypisz osobę..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Brak przypisania (Ktokolwiek)</SelectItem>
                      {members.map(m => (
                        <SelectItem key={m.user.id} value={m.user.id}>
                          {m.user.name || m.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {detectedOrder && (
                  <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/5 border border-indigo-500/15 rounded-xl flex items-center justify-between gap-3 transition-all duration-300">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase block select-none">
                        Powiązane zamówienie
                      </span>
                      <span className="text-xs text-foreground/90 font-semibold truncate block mt-0.5">
                        {detectedOrder.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label htmlFor="link-to-order" className="text-xs text-muted-foreground cursor-pointer select-none">
                        Powiąż
                      </label>
                      <input
                        id="link-to-order"
                        type="checkbox"
                        checked={linkToOrder}
                        onChange={e => setLinkToOrder(e.target.checked)}
                        className="h-4 w-4 rounded border-border bg-background focus:ring-indigo-500 text-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {detectedThread && (
                  <div className="p-3 bg-purple-500/10 dark:bg-purple-500/5 border border-purple-500/15 rounded-xl flex items-center justify-between gap-3 transition-all duration-300">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-purple-400 uppercase block select-none">
                        Powiązany wątek
                      </span>
                      <span className="text-xs text-foreground/90 font-semibold truncate block mt-0.5">
                        {detectedThread.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label htmlFor="link-to-thread" className="text-xs text-muted-foreground cursor-pointer select-none">
                        Powiąż
                      </label>
                      <input
                        id="link-to-thread"
                        type="checkbox"
                        checked={linkToThread}
                        onChange={e => setLinkToThread(e.target.checked)}
                        className="h-4 w-4 rounded border-border bg-background focus:ring-purple-500 text-purple-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Termin realizacji (due date)</label>
                  <Input 
                    type="datetime-local" 
                    value={newDueDate} 
                    onChange={e => setNewDueDate(e.target.value)} 
                    className="rounded-lg border-border/40 focus-visible:ring-indigo-500"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zapisz zadanie"}
                </Button>
              </form>
            ) : selectedTask ? (
              /* WIDOK SZCZEGÓŁÓW ZADANIA */
              <div className="flex flex-col h-full">
                <div className="p-4 bg-muted/30 border-b border-border/10 flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSelectedTask(null);
                      setTaskDetails(null);
                      fetchTasksData();
                    }}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Wróć do listy
                  </Button>
                  <div className="flex items-center gap-1.5">
                    {taskDetails && taskDetails.status !== "CLOSED" && (
                      <>
                        {taskDetails.status !== "RESOLVED" && (
                          <Button 
                            onClick={() => handleCloseTask("RESOLVED")}
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-[10px] border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 font-bold"
                          >
                            Rozwiąż
                          </Button>
                        )}
                        <Button 
                          onClick={() => handleCloseTask("CLOSED")}
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[10px] border-slate-500/20 text-slate-600 hover:bg-slate-500/10 font-bold"
                        >
                          Zamknij
                        </Button>
                      </>
                    )}
                    {taskDetails && taskDetails.status === "CLOSED" && (
                      <Button 
                        onClick={() => handleCloseTask("IN_PROGRESS")}
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[10px] border-indigo-500/20 text-indigo-600 hover:bg-indigo-500/10 font-bold"
                      >
                        Otwórz ponownie
                      </Button>
                    )}
                  </div>
                </div>

                {isDetailLoading || !taskDetails ? (
                  <div className="flex-1 flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <div className="p-6 space-y-5 flex-1 flex flex-col min-h-0 overflow-y-auto">
                    {/* Metadane */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(taskDetails.created_at).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getPriorityBadge(taskDetails.priority)}
                          {getStatusBadge(taskDetails.status)}
                        </div>
                      </div>

                      {(() => {
                        const parsed = parseTaskTitle(taskDetails.title);
                        return (
                          <div className="space-y-1">
                            {parsed.category && (
                              <Badge variant="outline" className="border-indigo-500/25 bg-indigo-500/5 text-indigo-400 text-[9px] h-5 font-bold px-2 py-0 select-none w-max block">
                                {parsed.category}
                              </Badge>
                            )}
                            <h2 className="text-base font-bold text-foreground leading-snug">
                              {parsed.title}
                            </h2>
                          </div>
                        );
                      })()}

                      {taskDetails.description && (
                        <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/20 whitespace-pre-wrap">
                          {taskDetails.description}
                        </p>
                      )}
                    </div>

                    <Separator className="bg-border/10" />

                    {/* Powiązane podmioty */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-muted/20 p-2.5 rounded-lg border border-border/20">
                        <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Zgłaszający</span>
                        <span className="font-medium truncate block">{taskDetails.created_by.name || taskDetails.created_by.email}</span>
                      </div>
                      <div className="bg-muted/20 p-2.5 rounded-lg border border-border/20">
                        <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Osoba przypisana</span>
                        <span className="font-medium truncate block">
                          {taskDetails.assigned_to ? (taskDetails.assigned_to.name || taskDetails.assigned_to.email) : "Dowolna"}
                        </span>
                      </div>
                    </div>

                    {/* Powiązanie z zamówieniem / czatem */}
                    {(taskDetails.order_id || taskDetails.thread_id) && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Powiązany zasób</span>
                        <div className="flex flex-wrap gap-2">
                          {taskDetails.order_id && (
                            <Button 
                              onClick={() => {
                                router.push(`/orders/${taskDetails.order_id}`);
                                setIsOpen(false);
                              }}
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] rounded-lg border-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10"
                            >
                              Zamówienie {taskDetails.order_id.substring(0, 8)}... <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          )}
                          {taskDetails.thread_id && (
                            <Button 
                              onClick={() => {
                                router.push(`/communication?thread=${taskDetails.thread_id}`);
                                setIsOpen(false);
                              }}
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] rounded-lg border-purple-500/10 text-purple-500 hover:bg-purple-500/10"
                            >
                              Wątek dyskusji <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator className="bg-border/10" />

                    {/* Komentarze / Dyskusja */}
                    <div className="space-y-3 flex-1 flex flex-col min-h-0">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-indigo-400" />
                        Dyskusja i Decyzje
                      </h4>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                        {taskDetails.comments.length === 0 ? (
                          <div className="text-center py-6 text-xs text-muted-foreground italic">
                            Brak wiadomości w dyskusji. Napisz pierwszą odpowiedź.
                          </div>
                        ) : (
                          taskDetails.comments.map((comment: any) => (
                            <div 
                              key={comment.id} 
                              className={`p-2.5 rounded-lg border text-xs ${
                                comment.author_id === user.id 
                                  ? "bg-indigo-500/5 border-indigo-500/10 ml-6" 
                                  : "bg-muted/35 border-border/30 mr-6"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1 text-[10px] font-semibold text-muted-foreground">
                                <span>{comment.author.name || comment.author.email}</span>
                                <span>{new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                              <p className="whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Pole wprowadzania nowego komentarza */}
                      {taskDetails.status !== "CLOSED" && (
                        <form onSubmit={handleAddComment} className="mt-auto pt-3">
                          <div className="flex gap-2 items-end">
                            <Textarea
                              placeholder={
                                taskDetails.type === "DECISION_REQUEST" && taskDetails.assigned_to_id === user.id
                                  ? "Wpisz swoją decyzję / feedback..."
                                  : "Wpisz komentarz..."
                              }
                              value={newComment}
                              onChange={e => setNewComment(e.target.value)}
                              rows={2}
                              required
                              className="rounded-lg border-border/40 focus-visible:ring-indigo-500 resize-none text-xs flex-1 min-h-[50px] p-2"
                            />
                            <Button 
                              type="submit" 
                              size="icon" 
                              disabled={isSubmittingComment || !newComment.trim()}
                              className="h-10 w-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                            >
                              {isSubmittingComment ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* LISTA ZADAŃ W ZAKŁADKACH */
              <Tabs defaultValue="todo" className="w-full flex flex-col h-full">
                <TabsList className="grid grid-cols-3 bg-muted/40 mx-4 my-2 p-1 rounded-lg border border-border/10 shrink-0">
                  <TabsTrigger value="todo" className="rounded-md text-xs py-1.5 font-semibold">
                    Do zrobienia ({filteredTodo.length})
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="rounded-md text-xs py-1.5 font-semibold">
                    Feedback ({filteredFeedback.length})
                  </TabsTrigger>
                  <TabsTrigger value="createdByMe" className="rounded-md text-xs py-1.5 font-semibold">
                    Zlecone ({filteredCreated.length})
                  </TabsTrigger>
                </TabsList>

                {/* ZAKŁADKA DO ZROBIENIA */}
                <TabsContent value="todo" className="flex-1 overflow-y-auto px-4 py-2 outline-none">
                  {filteredTodo.length === 0 ? (
                    <div className="text-center py-20 text-xs text-muted-foreground italic">
                      Brak zadań pasujących do filtrów.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTodo.map(task => {
                        const parsed = parseTaskTitle(task.title);
                        return (
                          <Card 
                            key={task.id} 
                            onClick={() => handleSelectTask(task)}
                            className={`hover:bg-muted/15 cursor-pointer transition-all duration-200 border-border/20 rounded-xl relative ${
                              !task.is_read_by_assignee ? "ring-1 ring-indigo-500/20 bg-indigo-500/5" : ""
                            }`}
                          >
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
                                  <UserIcon className="h-3 w-3" /> Od: {task.created_by.name || task.created_by.email}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {task.type === "DECISION_REQUEST" && (
                                    <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 border-none text-[9px] h-5 font-bold">Decyzja</Badge>
                                  )}
                                  {getPriorityBadge(task.priority)}
                                </div>
                              </div>
                              <div className="flex items-start gap-1.5 flex-wrap">
                                {parsed.category && (
                                  <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[8px] h-4.5 font-bold px-1.5 py-0 select-none shrink-0">
                                    {parsed.category}
                                  </Badge>
                                )}
                                <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug flex-1">
                                  {parsed.title}
                                </h4>
                              </div>
                              {task.description && (
                                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1">
                                <span>Aktualizacja: {new Date(task.updated_at).toLocaleDateString()}</span>
                                {getStatusBadge(task.status)}
                              </div>
                            </CardContent>
                            {!task.is_read_by_assignee && (
                              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500" />
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* ZAKŁADKA FEEDBACK */}
                <TabsContent value="feedback" className="flex-1 overflow-y-auto px-4 py-2 outline-none">
                  {filteredFeedback.length === 0 ? (
                    <div className="text-center py-20 text-xs text-muted-foreground italic">
                      Brak zadań pasujących do filtrów.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredFeedback.map(task => {
                        const parsed = parseTaskTitle(task.title);
                        return (
                          <Card 
                            key={task.id} 
                            onClick={() => handleSelectTask(task)}
                            className="hover:bg-muted/15 cursor-pointer transition-all duration-200 border-border/20 rounded-xl relative ring-1 ring-emerald-500/20 bg-emerald-500/5"
                          >
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
                                  Dla: {task.assigned_to ? (task.assigned_to.name || task.assigned_to.email) : "Każdy"}
                                </span>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] h-5 font-bold animate-pulse">Nowy feedback</Badge>
                              </div>
                              <div className="flex items-start gap-1.5 flex-wrap">
                                {parsed.category && (
                                  <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[8px] h-4.5 font-bold px-1.5 py-0 select-none shrink-0">
                                    {parsed.category}
                                  </Badge>
                                )}
                                <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug flex-1">
                                  {parsed.title}
                                </h4>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1">
                                <span>Odpowiedź: {new Date(task.updated_at).toLocaleDateString()}</span>
                                {getStatusBadge(task.status)}
                              </div>
                            </CardContent>
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* ZAKŁADKA ZLECONE */}
                <TabsContent value="createdByMe" className="flex-1 overflow-y-auto px-4 py-2 outline-none flex flex-col h-full">
                  <div className="flex justify-between items-center mb-3 px-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Historia zleceń</span>
                    <button 
                      onClick={() => setShowAllZlecone(!showAllZlecone)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors duration-200"
                    >
                      {showAllZlecone ? "Pokaż z ostatnich 2 tyg." : "Pokaż wszystkie"}
                    </button>
                  </div>

                  {filteredCreated.length === 0 ? (
                    <div className="text-center py-20 text-xs text-muted-foreground italic">
                      Brak zadań pasujących do filtrów.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredCreated.map(task => {
                        const parsed = parseTaskTitle(task.title);
                        return (
                          <Card 
                            key={task.id} 
                            onClick={() => handleSelectTask(task)}
                            className="hover:bg-muted/15 cursor-pointer transition-all duration-200 border-border/20 rounded-xl"
                          >
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  Dla: {task.assigned_to ? (task.assigned_to.name || task.assigned_to.email) : "Każdy"}
                                </span>
                                <div className="flex items-center gap-1">
                                  {task.type === "DECISION_REQUEST" && (
                                    <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 border-none text-[9px] h-5 font-bold">Decyzja</Badge>
                                  )}
                                  {getPriorityBadge(task.priority)}
                                </div>
                              </div>
                              <div className="flex items-start gap-1.5 flex-wrap">
                                {parsed.category && (
                                  <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[8px] h-4.5 font-bold px-1.5 py-0 select-none shrink-0">
                                    {parsed.category}
                                  </Badge>
                                )}
                                <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug flex-1">
                                  {parsed.title}
                                </h4>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1">
                                <span>Utworzono: {new Date(task.created_at).toLocaleDateString()}</span>
                                {getStatusBadge(task.status)}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
