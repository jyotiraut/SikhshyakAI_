import { Outlet } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '../teacher/header';
import { HodAssistantSidebar } from './hod-assistant-sidebar';

export default function HodAssistantSidebarLayout() {
  return (
    <SidebarProvider>
      <HodAssistantSidebar />

      <main className='flex flex-col flex-1'>
        <Header />

        <div className='p-4'>
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
