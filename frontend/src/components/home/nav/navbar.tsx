import { Menu, User, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/hook/auth/use-logout';
import { useAuth } from '@/lib/provider/use-auth-provider';
import { NavItems } from './nav-items';

export default function Navbar() {
  return (
    <nav className='flex justify-center items-center z-50'>
      <div className='flex justify-between w-[90%] fixed mt-20 bg-white rounded-full px-5'>
        <Link to={'/'} className=''>
          <img src='/logo.png' className='h-16' alt='logo' />
        </Link>
        <div className=' hidden md:flex  justify-center items-center gap-3'>
          <NavItems />
          <NavButtons />
        </div>
        <MobileView />
      </div>
    </nav>
  );
}

function MobileView() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction='right'>
      <DrawerTrigger asChild>
        <Button variant='ghost' size='lg' className='md:hidden'>
          <Menu size={24} />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className='sr-only'>Menu</DrawerTitle>
          <DrawerDescription className='sr-only'>Navigation Menu</DrawerDescription>
          <DrawerClose asChild>
            <Button variant='ghost' size='icon' className='ml-auto'>
              <X />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className='flex flex-col px-6 gap-4 text-lg'>
          <NavItems />
          <NavButtons />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function NavButtons() {
  const { user, role } = useAuth();
  const logout = useLogout();

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <User />
            Dashboard
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align='end' className='w-40'>
          <DropdownMenuItem asChild>
            <Link to={`/${role}/dashboard`}>Dashboard</Link>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={logout} className='text-red-600 focus:text-red-600'>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link to='/login'>
      <Button>Sign In</Button>
    </Link>
  );
}
