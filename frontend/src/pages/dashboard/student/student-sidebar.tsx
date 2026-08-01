import { Brain, Building2, CopyPlus, FileCheck, Home, Inbox, Settings } from 'lucide-react';
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
import { useAuth } from '@/lib/provider/use-auth-provider';

// Menu items.
const items = [
  {
    title: 'Home',
    url: '/student/dashboard',
    icon: Home,
  },
  {
    title: 'Adaptive Learning',
    url: 'adaptive',
    icon: Brain,
  },
  {
    title: 'Courses',
    url: 'courses',
    icon: CopyPlus,
  },
  {
    title: 'My Submissions',
    url: '/student/dashboard/submissions',
    icon: FileCheck,
  },
  {
    title: 'Account',
    url: 'account',
    icon: Inbox,
  },
  {
    title: 'Settings',
    url: 'settings',
    icon: Settings,
  },
];

export function StudentSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader>
        {user && (
          <div className='px-2 py-3'>
            <p className='truncate text-sm font-medium text-foreground'>{user.fullName}</p>
            {user.departmentName ? (
              <p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
                <Building2 className='h-3.5 w-3.5 shrink-0' />
                <span className='truncate'>{user.departmentName}</span>
              </p>
            ) : (
              // Accounts created before the department was captured at signup
              // have none on record; say so rather than showing a blank line.
              <p className='mt-1 text-xs text-muted-foreground italic'>No department assigned</p>
            )}
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroupLabel>
          <img src='/logo.png' alt='hhhh' className='mb-4 h-20' />
        </SidebarGroupLabel>
        <SidebarGroupContent className='pl-3'>
          <SidebarMenu>
            {items.map((item) => {
              // Check if current route matches this item
              const isActive =
                location.pathname === item.url ||
                (item.url !== '/student/dashboard' && location.pathname.includes(item.url));

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
