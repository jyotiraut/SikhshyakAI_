import type { RouteObject } from 'react-router';
import App from '@/App';
import About from '@/components/home/about';
import Contact from '@/components/home/contact';
import { HomeLayout } from './layout';

export const rootRoute: RouteObject[] = [
  {
    path: '/',
    element: <HomeLayout />,
    children: [
      {
        path: '',
        element: <App />,
      },
      {
        path: 'about',
        element: <About />,
      },
      {
        path: 'contact',
        element: <Contact />,
      },
    ],
  },
];
