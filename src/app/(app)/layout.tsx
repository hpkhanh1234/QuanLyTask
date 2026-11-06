"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Breadcrumb from "@/components/Breadcrumb";
import { ThemeProvider } from "@/lib/ThemeContext";
import ToastProvider from "@/components/ToastProvider";
import ChatBot from "@/components/ChatBot";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vnpt-blue"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 overflow-auto transition-colors duration-300">
              <Breadcrumb />
              {children}
            </main>
          </div>
        </div>
        <ChatBot />
      </ToastProvider>
    </ThemeProvider>
  );
}
