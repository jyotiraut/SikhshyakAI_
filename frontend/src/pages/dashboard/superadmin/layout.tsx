import { Outlet } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '../teacher/header';
import { SuperAdminSidebar } from './superadmin-sidebar';

export default function SuperAdminSidebarLayout() {
  return (
    <SidebarProvider>
      <SuperAdminSidebar />

      <main className='flex flex-col flex-1'>
        <Header />

        <div className='p-4'>
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
