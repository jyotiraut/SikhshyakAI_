import type { RouteObject } from 'react-router';
import { VerifyEmail } from '@/components/auth/email-verification';
import { LoginForm } from '@/components/auth/login';
import { RegistrationForm } from '@/components/auth/registration';
import { RoleSelectionPage } from '@/components/auth/role-selection-page';

export const authRoutes: RouteObject[] = [
  {
    path: 'role-selection',
    Component: RoleSelectionPage,
  },
  {
    path: '/signup',
    Component: RegistrationForm,
  },
  {
    path: '/login',
    Component: LoginForm,
  },
  {
    path: '/verify-email/:token',
    Component: VerifyEmail,
  },
];
