import { Outlet } from 'react-router';
import { Footer } from '@/components/home/footer';
import Navbar from '@/components/home/nav/navbar';

export const HomeLayout = () => {
  return (
    <div className='flex flex-col min-h-screen'>
      <Navbar />
      <main className='flex flex-col'>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
