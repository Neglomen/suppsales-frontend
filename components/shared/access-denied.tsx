// src/components/shared/access-denied.tsx
"use client";

import { motion } from "framer-motion";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function AccessDenied() {
  const router = useRouter();

  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="glass border-destructive/20 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden text-center text-slate-100">
          {/* Subtle neon glowing light effect */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-destructive/10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full animate-pulse" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/30">
                <ShieldAlert className="h-8 w-8" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight premium-gradient-text">
                Brak Uprawnień
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Niestety, nie posiadasz uprawnień do przeglądania tej zakładki aplikacji. 
                Skontaktuj się z administratorem lub właścicielem konta, aby uzyskać dostęp.
              </p>
            </div>

            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="mt-2 border-white/10 hover:bg-white/10 text-slate-200 gap-2 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
              Powrót do panelu
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
