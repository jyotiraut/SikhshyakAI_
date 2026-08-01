import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router';
import { adminRoutes } from './adminRoutes';
import { authRoutes } from './authRoutes';
import { hodAssistantRoutes } from './hodAssistantRoutes';
import { hodRoutes } from './hodRoutes';
import { rootRoute as rootRoutes } from './rootRoute';
import { studentRoutes } from './studentRoutes';
import { superadminRoutes } from './superadminRoute';
import { teacherRoutes } from './teacherRoutes';
export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <>
        <Outlet />
        <ScrollRestoration />
      </>
    ),
    children: [
      ...authRoutes,
      ...rootRoutes,
      ...teacherRoutes,
      ...studentRoutes,
      ...superadminRoutes,
      ...adminRoutes,
      ...hodRoutes,
      ...hodAssistantRoutes,
    ],
  },
]);
