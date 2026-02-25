import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { ClientProvider } from "@/hooks/useSelectedClient";

export function AppLayout() {
  return (
    <SidebarProvider>
      <ClientProvider>
        <div className="min-h-screen flex w-full" dir="rtl">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <header className="h-12 flex items-center border-b px-4 bg-card">
              <SidebarTrigger className="mr-2" />
            </header>
            <div className="flex-1 p-6 overflow-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </ClientProvider>
    </SidebarProvider>
  );
}
