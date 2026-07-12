"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@workspace/ui/components/sidebar"
import {
  IconBolt,
  IconMail,
  IconMailbox,
  IconFolders,
  IconSend,
  IconSettings,
  IconInbox,
  IconLayoutDashboard,
  IconTemplate,
  IconPlug,
  IconChartArea,
} from "@tabler/icons-react"

const overviewItems = [
  { label: "Dashboard", href: "/dashboard", icon: IconLayoutDashboard },
]

const setupItems = [
  { label: "Connections", href: "/connections", icon: IconMail },
  { label: "Leads", href: "/leads", icon: IconFolders },
  { label: "Sequences", href: "/sequences", icon: IconTemplate },
]

const outreachItems = [
  { label: "Campaigns", href: "/campaigns", icon: IconSend },
  { label: "Emails", href: "/emails", icon: IconInbox },
  { label: "Inbox", href: "/inbox", icon: IconMailbox },
  { label: "Analytics", href: "/analytics", icon: IconChartArea },
]

const integrationsItems = [
  { label: "MCP", href: "/mcp", icon: IconPlug },
]

export function AppSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="icon" className="border-none">
      {/* Logo / Workspace */}
      <SidebarHeader className="h-14 justify-center px-3 border-b border-sidebar-border/40">
        <Link href="/dashboard" className="flex items-center gap-2.5 group/sidebar-logo">
          <div className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-lg shadow-[0_0_16px_rgba(59,130,246,0.25)] group-hover/sidebar-logo:shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all duration-300">
            <IconBolt className="size-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight whitespace-nowrap transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden">
            Lightreach
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Overview */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.12em] px-3 text-muted-foreground/70 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden transition-all duration-200">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    className="gap-3 h-9 rounded-lg"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-[18px] shrink-0" />
                      <span className="text-[0.8125rem] font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-3 my-2 opacity-50" />

        {/* Setup */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.12em] px-3 text-muted-foreground/70 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden transition-all duration-200">
            Setup
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {setupItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    className="gap-3 h-9 rounded-lg"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-[18px] shrink-0" />
                      <span className="text-[0.8125rem] font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-3 my-2 opacity-50" />

        {/* Outreach */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.12em] px-3 text-muted-foreground/70 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden transition-all duration-200">
            Outreach
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {outreachItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    className="gap-3 h-9 rounded-lg"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-[18px] shrink-0" />
                      <span className="text-[0.8125rem] font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-3 my-2 opacity-50" />

        {/* Integrations */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.12em] px-3 text-muted-foreground/70 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:overflow-hidden transition-all duration-200">
            Integrations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {integrationsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    className="gap-3 h-9 rounded-lg"
                  >
                    <Link href={item.href}>
                      <item.icon className="size-[18px] shrink-0" />
                      <span className="text-[0.8125rem] font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border/40 px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/settings")}
              tooltip="Settings"
              className="gap-3 h-9 rounded-lg"
            >
              <Link href="/settings">
                <IconSettings className="size-[18px] shrink-0" />
                <span className="text-[0.8125rem] font-medium">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
