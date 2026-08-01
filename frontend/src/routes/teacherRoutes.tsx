import type { RouteObject } from 'react-router';
import { ProtectedRoute } from '@/components/access-control/protected-route';
import { CourseEnrollments } from '@/components/course/course-enrollments';
import Course from '@/pages/dashboard/teacher/courses/course';
import { EditCoursePage } from '@/pages/dashboard/teacher/courses/course-edit-page';
import { CourseLeaderboard } from '@/pages/dashboard/teacher/courses/course-leaderboard';
import { CreateOutlineForm } from '@/pages/dashboard/teacher/courses/course-outline-create-form';
import { CoursesPage } from '@/pages/dashboard/teacher/courses/courses';
import { EditQuizSet } from '@/pages/dashboard/teacher/courses/quizzes/edit-quiz-set-page';
import UnitWiseQuize from '@/pages/dashboard/teacher/courses/quizzes/unitwise-quiz';
import TeacherSidebarLayout from '@/pages/dashboard/teacher/layout';
import { TeacherDashboardHome } from '@/pages/dashboard/teacher/teacher-dashboard-home';
import { EditTutorialSet } from '@/pages/dashboard/teacher/tutorials/edit-tutorial-set';
import { TutorialSubmissions } from '@/pages/dashboard/teacher/tutorials/tutorials-submissions';
import UnitWiseTutorial from '@/pages/dashboard/teacher/tutorials/unit-wise-tutorial';
import { EditUnitPage } from '@/pages/dashboard/teacher/unit/edit-unit';
export const teacherRoutes: RouteObject[] = [
  {
    path: '/teacher/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['teacher']}>
        <TeacherSidebarLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <TeacherDashboardHome />,
      },

      {
        path: 'courses',
        children: [
          {
            index: true,
            element: <CoursesPage />,
          },
          {
            path: 'create-new',
            element: <CreateOutlineForm mode='create' />,
          },
          {
            path: 'edit/:id',
            element: <EditCoursePage />,
          },
          {
            path: ':id',
            children: [
              {
                index: true,
                element: <Course />,
              },
              {
                path: 'edit-unit/:unitid',
                element: <EditUnitPage />,
              },
              {
                path: ':unitid/view-quiz',
                children: [
                  {
                    index: true,
                    element: <UnitWiseQuize />,
                  },
                  {
                    path: 'edit-quiz/:quizid',
                    element: <EditQuizSet />,
                  },
                ],
              },
              {
                path: ':unitid/view-tutorial',
                children: [
                  {
                    index: true,
                    element: <UnitWiseTutorial />,
                  },
                  {
                    path: 'edit-tutorial/:tutorialid',
                    element: <EditTutorialSet />,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: 'submissions',
        element: <TutorialSubmissions />,
      },
      {
        path: 'leaderboards',
        element: <CourseLeaderboard />,
      },
      {
        path: 'search',
        element: <div>hello search</div>,
      },
      {
        path: 'enrollments',
        element: <CourseEnrollments />,
      },
    ],
  },
];
