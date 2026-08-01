import { Outlet } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '../teacher/header';
import { HodSidebar } from './hod-sidebar';

export default function HodSidebarLayout() {
  return (
    <SidebarProvider>
      <HodSidebar />

      <main className='flex flex-col flex-1'>
        <Header />

        <div className='p-4'>
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
