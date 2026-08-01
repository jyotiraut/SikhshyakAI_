import { Outlet } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '../teacher/header';
import { StudentSidebar } from './student-sidebar';

export default function StudentSidebarLayout() {
  return (
    <SidebarProvider>
      <StudentSidebar />

      <main className='flex flex-col flex-1'>
        <Header />

        <div className='p-4'>
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
