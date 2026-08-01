import React from 'react';
import { Link, useLocation } from 'react-router';
import {
  Breadcrumb,
  BreadcrumbEllipsis as BreadcrumbEllipsisIcon,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLogout } from '@/hook/auth/use-logout';
import { useAuth } from '@/lib/provider/use-auth-provider';
import { getBreadcrumbs } from '@/utils/breadcrumbs';

export default function Header() {
  const pathname = useLocation().pathname;
  const { user, role } = useAuth();
  const logout = useLogout();

  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className='flex gap-2 justify-between items-center p-4 border-b'>
      <div className='flex gap-1 items-center'>
        <SidebarTrigger size='lg' className='-ml-1' />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to='/'>Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.length > 0 && <BreadcrumbSeparator />}
            {breadcrumbs.map((breadcrumb) => {
              if (Array.isArray(breadcrumb)) {
                return <BreadcrumbEllipsis key={breadcrumb.length} breadcrumbs={breadcrumb} />;
              }
              return (
                <React.Fragment key={breadcrumb.href}>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={breadcrumb.href}>{breadcrumb.label}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {!breadcrumb.isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {role && user?.fullName && (
        <div className='flex items-center gap-2'>
          <div className='text-md font-bold text-primary'>
            {role.charAt(0).toUpperCase() + role.slice(1)} - {user.fullName}
          </div>
          <Button onClick={logout} size='sm'>
            Logout
          </Button>
        </div>
      )}
    </header>
  );
}

type TBreadcrumbItem = {
  href: string;
  label: string;
  isLast: boolean;
};

function BreadcrumbEllipsis({ breadcrumbs }: { breadcrumbs: TBreadcrumbItem[] }) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className='flex items-center gap-1'>
          <BreadcrumbEllipsisIcon />
          <span className='sr-only'>Toggle menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start'>
          {breadcrumbs.map((breadcrumb) => (
            <DropdownMenuItem asChild key={breadcrumb.href}>
              <Link to={breadcrumb.href}>{breadcrumb.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <BreadcrumbSeparator />
    </>
  );
}
