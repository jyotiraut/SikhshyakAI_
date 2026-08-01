import { BookOpen, Clock, Edit, Lightbulb, Target, Trash } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useGetCourse } from '@/hook/class/use-get-course';
import { useDeleteUnit } from '@/hook/unit/update-unit';
import GenerateQuiz from './quizzes/generate-quiz';

0;
export default function Course() {
  const { id } = useParams();
  const { data } = useGetCourse(id!);
  const datas = data?.course;
  const { mutate, isPending: isDeleting } = useDeleteUnit();

  if (!datas) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg text-gray-500'>Loading course details...</div>
      </div>
    );
  }
  const { course, units } = data;

  return (
    <div className='max-w-5xl mx-auto p-6 space-y-8'>
      {/* Course Header */}
      <div className='space-y-4'>
        <h1 className='text-4xl font-bold text-gray-900'>{course.title}</h1>
        <p className='text-lg text-gray-600'>{course.description}</p>

        <div className='flex flex-wrap gap-6 text-sm text-gray-600 pt-4'>
          <div className='flex items-center gap-2'>
            <BookOpen className='w-4 h-4' />
            <span>{units.length} Units</span>
          </div>
          <div className='flex items-center gap-2'>
            <Clock className='w-4 h-4' />
            <span>
              {course.teacherProvided.totalPeriods} Periods ({course.teacherProvided.periodDurationMinutes} min each)
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium'>Pace:</span>
            <span className='capitalize'>{course.teacherProvided.pace}</span>
          </div>
        </div>

        <div className='pt-2 border-t'>
          <p className='text-sm text-gray-600'>
            <span className='font-medium'>Instructor:</span> {course.teacher.fullName}
          </p>
        </div>
      </div>

      {/* Units Accordion */}
      <div className='space-y-4'>
        <h2 className='text-2xl font-semibold text-gray-900'>Course Units</h2>

        <Accordion type='single' collapsible className='space-y-3'>
          {units.map((unit) => (
            <AccordionItem
              key={unit._id}
              value={unit._id}
              className='border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow'
            >
              <AccordionTrigger className='px-6 py-4 hover:no-underline'>
                <div className='flex items-start gap-4 text-left w-full'>
                  <div className='flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm'>
                    {unit.unitNumber}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-gray-900'>{unit.title}</h3>
                    <p className='text-sm text-gray-600 mt-1'>{unit.description}</p>
                    <div className='flex items-center gap-4 mt-2 text-xs text-gray-500'>
                      <span className='flex items-center gap-1'>
                        <Clock className='w-3 h-3' />
                        {unit.estimatedTime.totalMinutes} min
                      </span>
                      <span>Theory: {unit.estimatedTime.theoryMinutes} min</span>
                      <span>Practical: {unit.estimatedTime.practicalMinutes} min</span>
                      <span>unit status :{unit.status}</span>
                      <Button asChild>
                        <Link to={`edit-unit/${unit._id}`}>
                          <Edit />
                        </Link>
                      </Button>
                      <Button variant={'destructive'} onClick={() => mutate({ id: unit._id })} disabled={isDeleting}>
                        <Trash />
                      </Button>
                      <GenerateQuiz unitId={unit._id} />
                      <Button asChild>
                        <Link to={`${unit._id}/view-quiz`}>View Quiz</Link>
                      </Button>
                      {/* <GenerateTutorial unitId={unit._id} /> */}
                      <Button asChild>
                        <Link to={`${unit._id}/view-tutorial`}>View Tutorial</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className='px-6 pb-6 pt-2'>
                <div className='space-y-6'>
                  {/* Teaching Plan Overview */}
                  <div>
                    <h4 className='font-medium text-gray-900 mb-2'>Overview</h4>
                    <p className='text-gray-700 text-sm'>{unit.teachingPlan.overview}</p>
                  </div>

                  {/* Learning Objectives */}
                  <div>
                    <h4 className='font-medium text-gray-900 mb-2 flex items-center gap-2'>
                      <Target className='w-4 h-4 text-blue-600' />
                      Learning Objectives
                    </h4>
                    <ul className='space-y-2'>
                      {unit.learningObjectives.map((objective, idx) => (
                        <li key={idx} className='flex items-start gap-2 text-sm text-gray-700'>
                          <span className='text-blue-600 mt-0.5'>•</span>
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Teaching Methods */}
                  <div>
                    <h4 className='font-medium text-gray-900 mb-2 flex items-center gap-2'>
                      <BookOpen className='w-4 h-4 text-green-600' />
                      Teaching Methods
                    </h4>
                    <div className='flex flex-wrap gap-2'>
                      {unit.teachingPlan.methods.map((method, idx) => (
                        <span
                          key={idx}
                          className='px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium'
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Activities */}
                  <div>
                    <h4 className='font-medium text-gray-900 mb-2 flex items-center gap-2'>
                      <Lightbulb className='w-4 h-4 text-yellow-600' />
                      Activities
                    </h4>
                    <div className='grid gap-2'>
                      {unit.teachingPlan.activities.map((activity, idx) => (
                        <div
                          key={idx}
                          className='px-3 py-2 bg-yellow-50 border border-yellow-100 rounded text-sm text-gray-700'
                        >
                          {activity}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
