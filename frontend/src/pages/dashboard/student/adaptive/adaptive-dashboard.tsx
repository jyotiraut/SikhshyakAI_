import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetCourseInfo } from '@/hook/student/adaptive/use-get-course-info';
import type {
  CourseProgress,
  UnitProgress as UnitProgressType,
} from '@/hook/student/adaptive/use-get-overall-progress';
import { useGetOverallProgress } from '@/hook/student/adaptive/use-get-overall-progress';
import { useGetUnitInfo } from '@/hook/student/adaptive/use-get-unit-info';

// Sub-component to resolve course title (hooks can't be called inside .map)
function CourseTabLabel({ courseId }: { courseId: string }) {
  const { data: courseInfo } = useGetCourseInfo(courseId);
  const title = courseInfo?.data?.title?.trim();
  return <span className='truncate'>{title || `Course ${courseId}`}</span>;
}

// Sub-component to resolve unit title
function UnitTitle({ unitId }: { unitId: string }) {
  const { data: unitInfo } = useGetUnitInfo(unitId);
  const title = unitInfo?.data?.title?.trim();
  const unitNumber = unitInfo?.data?.unitNumber;
  if (title) {
    return <>{unitNumber ? `Unit ${unitNumber}: ${title}` : title}</>;
  }
  return <>Unit {unitId}</>;
}

// Sub-component for a single unit card
function UnitCard({ unit }: { unit: UnitProgressType }) {
  return (
    <div
      key={unit.unit_id}
      className={`p-4 rounded-lg ${
        unit.is_current_unit
          ? 'bg-blue-50 border border-blue-200'
          : unit.total_attempted > 0
            ? 'bg-gray-50 border border-gray-200'
            : 'bg-gray-100 border border-gray-300'
      }`}
    >
      <div className='flex items-center justify-between mb-2'>
        <h4 className='font-semibold text-gray-900'>
          <UnitTitle unitId={unit.unit_id} />
        </h4>
        <span className='text-sm text-gray-600'>
          {unit.total_attempted}/{unit.total_correct} correct · {Math.round((unit.accuracy ?? 0) * 100)}%
        </span>
      </div>
      <div className='flex items-center gap-2 mb-3'>
        {unit.is_current_unit && (
          <span className='px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium'>Current</span>
        )}
        {unit.is_recommended_unit && (
          <span className='px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium'>Recommended</span>
        )}
        {unit.total_attempted === 0 && (
          <span className='px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium'>Not Started</span>
        )}
      </div>
      <Progress value={(unit.accuracy ?? 0) * 100} className='h-2' />

      {/* Learning Objectives for this unit */}
      {(unit.learning_objectives ?? []).some((lo) => lo.attempted > 0) && (
        <div className='mt-3 grid grid-cols-2 md:grid-cols-4 gap-2'>
          {(unit.learning_objectives ?? []).map((lo) => {
            const masteryValue = lo.mastery || 0;
            const masteryStatus =
              lo.attempted === 0
                ? 'not_started'
                : masteryValue >= 0.8
                  ? 'mastered'
                  : masteryValue >= 0.5
                    ? 'in_progress'
                    : 'needs_improvement';
            return (
              <div
                key={lo.learningObjectiveIndex}
                className={`p-2 rounded text-xs ${
                  masteryStatus === 'mastered'
                    ? 'bg-green-100 border border-green-300'
                    : masteryStatus === 'in_progress'
                      ? 'bg-yellow-100 border border-yellow-300'
                      : masteryStatus === 'not_started'
                        ? 'bg-gray-200 border border-gray-300'
                        : 'bg-red-100 border border-red-300'
                }`}
              >
                <div className='font-medium'>LO {lo.learningObjectiveIndex + 1}</div>
                <div className='text-xs'>
                  {Math.round((lo.accuracy ?? 0) * 100)}% • {lo.attempted} attempts
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Sub-component for a single course tab content
function CourseTabContent({ course }: { course: CourseProgress }) {
  return (
    <div className='space-y-6'>
      {/* Course Statistics */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4'>
        <div>
          <div className='text-sm text-gray-600'>Questions Attempted</div>
          <div className='text-2xl font-bold'>{course.total_attempted}</div>
        </div>
        <div>
          <div className='text-sm text-gray-600'>Correct Answers</div>
          <div className='text-2xl font-bold'>{course.total_correct}</div>
        </div>
        <div>
          <div className='text-sm text-gray-600'>Accuracy</div>
          <div className='text-2xl font-bold'>{Math.round((course.accuracy ?? 0) * 100)}%</div>
          <Progress value={(course.accuracy ?? 0) * 100} className='mt-2' />
        </div>
        <div>
          <div className='text-sm text-gray-600'>Mastery Score</div>
          <div className='text-2xl font-bold'>{Math.round((course.mastery_score ?? 0) * 100)}%</div>
          <Progress value={(course.mastery_score ?? 0) * 100} className='mt-2' />
        </div>
        <div>
          <div className='text-sm text-gray-600'>Pace Score</div>
          <div className='text-2xl font-bold'>{Math.round((course.pace_score ?? 0) * 100)}%</div>
          <Progress value={(course.pace_score ?? 0) * 100} className='mt-2' />
        </div>
        <div>
          <div className='text-sm text-gray-600'>Difficulty Level</div>
          <div className={`text-2xl font-bold capitalize`}>{course.difficulty_level}</div>
          <div className='text-xs text-gray-500 mt-1'>
            L: {course.difficulty_distribution?.low.toFixed(1)}% | M: {course.difficulty_distribution?.mid.toFixed(1)}%
            | H: {course.difficulty_distribution?.high.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Units Progress */}
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold text-gray-900'>Units Progress</h3>
        {(course.units ?? []).map((unit) => (
          <UnitCard key={unit.unit_id} unit={unit} />
        ))}
      </div>
    </div>
  );
}

export function AdaptiveLearningDashboard() {
  const { data: overallProgress, isLoading } = useGetOverallProgress();
  const [activeTab, setActiveTab] = useState<string>('');

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg text-gray-500'>Loading adaptive learning data...</div>
      </div>
    );
  }

  const progressData = overallProgress?.data?.data;

  // Set default tab on first load
  if (!activeTab && progressData?.progress_by_course && progressData.progress_by_course.length > 0) {
    setActiveTab(progressData.progress_by_course[0].course_id);
  }

  return (
    <div className='max-w-6xl mx-auto p-6 space-y-8'>
      {/* Header */}
      <div className='space-y-4'>
        <h1 className='text-3xl font-bold text-gray-900'>Adaptive Learning Dashboard</h1>
        <p className='text-gray-600'>
          Track your learning progress across all courses with personalized difficulty levels and mastery scores.
        </p>
      </div>

      {/* Overall Statistics */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Total Questions Attempted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{progressData?.total_questions_attempted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Total Correct Answers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{progressData?.total_correct_answers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Overall Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{Math.round((progressData?.overall_accuracy ?? 0) * 100)}%</div>
            <Progress value={(progressData?.overall_accuracy ?? 0) * 100} className='mt-2' />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Mastery Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{Math.round((progressData?.mastery_score ?? 0) * 100)}%</div>
            <Progress value={(progressData?.mastery_score ?? 0) * 100} className='mt-2' />
          </CardContent>
        </Card>
      </div>

      {/* Courses Progress */}
      {progressData?.progress_by_course && progressData.progress_by_course.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progress by Course</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className='mb-6 grid w-full grid-cols-3'>
                {progressData.progress_by_course.map((course) => (
                  <TabsTrigger key={course.course_id} value={course.course_id}>
                    <CourseTabLabel courseId={course.course_id} />
                  </TabsTrigger>
                ))}
              </TabsList>

              {progressData.progress_by_course.map((course) => (
                <TabsContent key={course.course_id} value={course.course_id}>
                  <CourseTabContent course={course} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
