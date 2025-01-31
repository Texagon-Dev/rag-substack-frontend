'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /chat/new or the first chat
    router.push('/chat/new');
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="text-white">Loading...</div>
    </div>
  );
}