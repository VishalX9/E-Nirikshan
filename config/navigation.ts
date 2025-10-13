import { LayoutDashboard, FileText, Users, User, FolderKanban, BarChart4, Settings2 } from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[];
}

export const primaryNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "KPI", href: "/kpi", icon: BarChart4 },
  { name: "DPR", href: "/dpr", icon: FileText },
  { name: "Employees", href: "/employees", icon: Users, roles: ["admin"] },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "APAR", href: "/apar", icon: BarChart4 },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings2 },
];
