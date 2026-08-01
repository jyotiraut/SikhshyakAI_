import { Outlet } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '../teacher/header';
import { AdminSidebar } from './admin-sidebar';

export default function AdminSidebarLayout() {
  return (
    <SidebarProvider>
      <AdminSidebar />

      <main className='flex flex-col flex-1'>
        <Header />

        <div className='p-4'>
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
