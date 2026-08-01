import type { RouteObject } from 'react-router';
import { ProtectedRoute } from '@/components/access-control/protected-route';
import SuperAdminSidebarLayout from '@/pages/dashboard/superadmin/layout';
import { AllPrincipalsPage } from '@/pages/dashboard/superadmin/principal/principals';
import { AllSchoolPage } from '@/pages/dashboard/superadmin/school/all-school';
import { SuperAdminDashboardStats } from '@/pages/dashboard/superadmin/stats';

export const superadminRoutes: RouteObject[] = [
  {
    path: '/superadmin/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['superadmin']}>
        <SuperAdminSidebarLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <SuperAdminDashboardStats />,
      },
      {
        path: 'school',
        element: <AllSchoolPage />,
      },
      {
        path: 'principal',
        element: <AllPrincipalsPage />,
      },

      {
        path: 'account',
        element: <div>student account settings template</div>,
      },
    ],
  },
];
