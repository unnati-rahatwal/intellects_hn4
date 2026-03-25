"use client";

import Sidebar from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0A0F1C]">
      <Sidebar />
      <div 
        className="flex-1 flex flex-col min-w-0 transition-all duration-300 print:ml-0 print:p-0"
        style={{ marginLeft: 'var(--current-sidebar-width, 260px)' }}
      >
        <main className="flex-1 p-6 mt-(--header-height) print:m-0 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
