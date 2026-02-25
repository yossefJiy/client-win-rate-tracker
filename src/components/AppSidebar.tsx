import { Users, FileText, DollarSign, Briefcase, FolderOpen } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const items = [
  { title: "לקוחות", url: "/clients", icon: Users },
  { title: "הסכמי אחוזים", url: "/agreements", icon: FileText },
  { title: "תשלומים", url: "/payouts", icon: DollarSign },
  { title: "שירותים חודשיים", url: "/services", icon: Briefcase },
  { title: "פרויקטים", url: "/projects", icon: FolderOpen },
];

export function AppSidebar() {
  return (
    <Sidebar side="right" className="border-l border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <h1 className="text-lg font-bold text-sidebar-primary-foreground">ניהול עמלות</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs">תפריט</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
