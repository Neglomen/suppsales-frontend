"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");

  async function testAPI() {
    const res = await fetch("http://localhost:8000/api/health");
    const data = await res.json();
    setMessage(data.status);
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Test połączenia z backendem</h1>
      <button
        onClick={testAPI}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Testuj
      </button>
      {message && <p>Odpowiedź API: {message}</p>}
    </main>
  );
}
