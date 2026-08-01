import { Outlet } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from './header';
import { TeacherSidebar } from './teacher-sidebar';

export default function TeacherSidebarLayout() {
  return (
    <SidebarProvider>
      <TeacherSidebar />

      <main className='flex flex-col flex-1'>
        <Header />

        <div className='p-4'>
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
