import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { ResizableSidebar } from "@/components/resizable-sidebar"
import { SidebarInset } from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <ResizableSidebar>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="relative flex flex-1 flex-col gap-6 p-6">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/[0.03] blur-[120px]" />
              <div className="absolute top-[20%] right-[10%] h-[300px] w-[400px] rounded-full bg-primary/[0.015] blur-[100px]" />
              <div className="absolute bottom-[10%] left-[20%] h-[250px] w-[350px] rounded-full bg-primary/[0.01] blur-[80px]" />
            </div>
            {children}
          </main>
        </SidebarInset>
      </ResizableSidebar>
    </TooltipProvider>
  )
}
