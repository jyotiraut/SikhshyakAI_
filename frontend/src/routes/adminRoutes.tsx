import type { RouteObject } from 'react-router';
import { ProtectedRoute } from '@/components/access-control/protected-route';
import { DepartmentCourseLeaderboard } from '@/pages/dashboard/admin/department-course-leaderboard';
import { DepartmentsPage } from '@/pages/dashboard/admin/departments';
import AdminSidebarLayout from '@/pages/dashboard/admin/layout';
import { AdminDashboard } from '@/pages/dashboard/admin/stats';

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminSidebarLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '',
        element: <AdminDashboard />,
      },
      {
        path: 'departments',
        element: <DepartmentsPage />,
      },
      {
        path: 'departments/:departmentId/leaderboard',
        element: <DepartmentCourseLeaderboard />,
      },

      // {
      //   path: 'students',
      //   element: <div>Students Management</div>,
      // },
      // {
      //   path: 'courses',
      //   element: <div>Courses Management</div>,
      // },
      // {
      //   path: 'settings',
      //   element: <div>Admin Settings</div>,
      // },
    ],
  },
];
