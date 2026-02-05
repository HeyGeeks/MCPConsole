'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/layout/icons';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { MessageSquare, Sparkles, Boxes, Server } from 'lucide-react';

const settingsNavItems = [
  { href: '/settings/providers', label: 'Providers', icon: Boxes },
  { href: '/settings/mcp', label: 'MCP Servers', icon: Server },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSettingsRoute = pathname.startsWith('/settings');
  const isChatRoute = pathname === '/';

  return (
    <SidebarProvider>
      <Sidebar className="border-r bg-background">
        <SidebarHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Logo className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight">MCPConsole</span>
              <span className="text-xs text-muted-foreground">AI & MCP Server Client</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4">
          <SidebarMenu className="space-y-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isChatRoute} tooltip="Chat" className="h-10">
                <Link href="/">
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <Separator className="my-2" />
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Settings
              </p>
            </div>
            {settingsNavItems.map(item => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className="h-10"
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
                <a href="https://Heygeeks.in" target="_blank" rel="noopener noreferrer">
                <span>Developed by Heygeeks.in</span>
                </a>
            </div>
            <ThemeToggle />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex h-dvh flex-col overflow-hidden">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden flex-shrink-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 font-semibold">
            <Logo className="h-5 w-5 text-primary" />
            <span className="text-sm">MCPConsole</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {isSettingsRoute ? (
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="container mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                      Manage your AI providers, MCP servers, and application settings.
                    </p>
                  </div>
                  {children}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">{children}</div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
