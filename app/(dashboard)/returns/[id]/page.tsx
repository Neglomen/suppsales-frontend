// src/app/(dashboard)/returns/[id]/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

// TODO: Zdefiniować pełny interfejs ReturnDetails
interface ReturnDetails {
  id: string;
  external_return_id: string | null;
  status: string;
  buyer_login: string | null;
  details_payload: any;
}

function ReturnDetailsContent() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [returnData, setReturnData] = useState<ReturnDetails | null>(null);

  useEffect(() => {
    if (id) {
      api
        .get<ReturnDetails>(`/returns/${id}`)
        .then((response) => setReturnData(response.data))
        .catch(() => toast.error("Nie udało się pobrać szczegółów zwrotu."));
    }
  }, [id]);

  if (!returnData)
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  return (
    <div>
      <h1 className="text-2xl font-bold">
        Szczegóły Zwrotu #{returnData.external_return_id}
      </h1>
      <pre className="mt-4 bg-muted p-4 rounded-lg overflow-x-auto">
        {JSON.stringify(returnData.details_payload, null, 2)}
      </pre>
    </div>
  );
}

export default function ReturnDetailsPage() {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <ReturnDetailsContent />
    </Suspense>
  );
}
