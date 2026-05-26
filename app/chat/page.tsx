"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatLayout } from "@/components/chat/ChatLayout";

export default function ChatPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");

  useEffect(() => {
    const id = sessionStorage.getItem("student_id");
    const name = sessionStorage.getItem("student_name") ?? "";
    if (!id) {
      router.replace("/");
      return;
    }
    setStudentId(id);
    setStudentName(name);
  }, [router]);

  if (!studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return <ChatLayout studentId={studentId} studentName={studentName} />;
}
