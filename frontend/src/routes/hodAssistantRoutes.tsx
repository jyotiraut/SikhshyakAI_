import type { RouteObject } from 'react-router';
import { ProtectedRoute } from '@/components/access-control/protected-route';
import HodAssistantSidebarLayout from '@/pages/dashboard/hod_assistant/layout';

export const hodAssistantRoutes: RouteObject[] = [
  {
    path: '/hod_assistant/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['hod_assistant']}>
        <HodAssistantSidebarLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '',
        element: <div>HOD Assistant Dashboard</div>,
      },
      {
        path: 'courses',
        element: <div>Courses Management</div>,
      },
      {
        path: 'students',
        element: <div>Students Management</div>,
      },
      {
        path: 'reports',
        element: <div>Reports</div>,
      },
      {
        path: 'settings',
        element: <div>HOD Assistant Settings</div>,
      },
    ],
  },
];
