import type { RouteObject } from 'react-router';
import { ProtectedRoute } from '@/components/access-control/protected-route';
import { DepartmentCourses } from '@/pages/dashboard/hod/courses';
import { HodDashboardStats } from '@/pages/dashboard/hod/hod-dashboard-home';
import HodSidebarLayout from '@/pages/dashboard/hod/layout';
import { DepartmentStudents } from '@/pages/dashboard/hod/students';

export const hodRoutes: RouteObject[] = [
  {
    path: '/hod/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['hod']}>
        <HodSidebarLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '',
        element: <HodDashboardStats />,
      },
      {
        path: 'courses',
        element: <DepartmentCourses />,
      },
      {
        path: 'students',
        element: <DepartmentStudents />,
      },
    ],
  },
];
