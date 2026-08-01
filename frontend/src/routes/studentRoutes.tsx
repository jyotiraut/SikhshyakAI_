import type { RouteObject } from 'react-router';
import { ProtectedRoute } from '@/components/access-control/protected-route';
import { AdaptiveLearningDashboard } from '@/pages/dashboard/student/adaptive/adaptive-dashboard';
import { AdaptiveQuizPage } from '@/pages/dashboard/student/adaptive/adaptive-quiz';
import { CoursesPage } from '@/pages/dashboard/student/courses/all-published-course';
import Course from '@/pages/dashboard/student/courses/course';
import StudentSidebarLayout from '@/pages/dashboard/student/layout';
import { UnitWiseQuiz } from '@/pages/dashboard/student/quiz/quiz-questions';
import { StudentStats } from '@/pages/dashboard/student/student-stats';
import { MyTutorialSubmissions } from '@/pages/dashboard/student/submissions/my-submissions';
import { SubmissionDetailPage } from '@/pages/dashboard/student/submissions/submissions-details';
import { TutorialDetailPage } from '@/pages/dashboard/student/tutorails/tutorials-details';
import { UnitTutorialsPage } from '@/pages/dashboard/student/tutorails/unit-tutorials';

export const studentRoutes: RouteObject[] = [
  {
    path: '/student/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <StudentSidebarLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <StudentStats />,
      },
      {
        path: 'adaptive',
        children: [
          {
            index: true,
            element: <AdaptiveLearningDashboard />,
          },
          {
            path: 'course/:courseId/unit/:unitId',
            element: <AdaptiveQuizPage />,
          },
        ],
      },
      {
        path: 'courses',
        children: [
          {
            index: true,
            element: <CoursesPage />,
          },
          {
            path: ':id',
            children: [
              {
                index: true,
                element: <Course />,
              },
              {
                path: 'quiz/:unitid',
                element: <UnitWiseQuiz />,
              },
              {
                path: 'tutorials/:unitid',
                children: [
                  {
                    index: true,
                    element: <UnitTutorialsPage />,
                  },
                  {
                    path: ':tutorialId',
                    element: <TutorialDetailPage />,
                  },
                ],
              },
              {
                path: 'adaptive/:unitid',
                element: <AdaptiveQuizPage />,
              },
            ],
          },
        ],
      },
      {
        path: 'submissions',
        children: [
          {
            index: true,
            element: <MyTutorialSubmissions />,
          },
          {
            path: ':submissionId',
            element: <SubmissionDetailPage />,
          },
        ],
      },
      {
        path: 'account',
        element: <div>student account settings template</div>,
      },
    ],
  },
];
