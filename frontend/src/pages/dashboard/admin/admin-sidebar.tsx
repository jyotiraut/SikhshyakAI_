import { Building, Home } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
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
} from '@/components/ui/sidebar';

// Menu items.
const items = [
  {
    title: 'Dashboard',
    url: '/admin/dashboard',
    icon: Home,
  },
  {
    title: 'Departments',
    url: 'departments',
    icon: Building,
  },
  // {
  //   title: 'Students',
  //   url: 'students',
  //   icon: GraduationCap,
  // },
  // {
  //   title: 'Courses',
  //   url: 'courses',
  //   icon: BookOpen,
  // },
  // {
  //   title: 'Settings',
  //   url: 'settings',
  //   icon: Settings,
  // },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroupLabel>
          <img src='/logo.png' alt='School Logo' className='mb-4 h-20' />
        </SidebarGroupLabel>
        <SidebarGroupContent className='pl-3'>
          <SidebarMenu>
            {items.map((item) => {
              // Check if current route matches this item
              const isActive =
                location.pathname === item.url ||
                (item.url !== '/admin/dashboard' && location.pathname.includes(item.url));

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <NavLink
                      to={item.url}
                      className={isActive ? 'bg-primary text-white hover:bg-primary hover:text-white' : ''}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
