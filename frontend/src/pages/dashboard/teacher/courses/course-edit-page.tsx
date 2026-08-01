import { useParams } from 'react-router';
import { useGetCourse } from '@/hook/class/use-get-course';
import { CreateOutlineForm } from './course-outline-create-form';

export function EditCoursePage() {
  const { id } = useParams();
  const { data } = useGetCourse(id!);
  const values = data?.course;
  if (!values) return null;
  return (
    <CreateOutlineForm
      mode='edit'
      id={id!}
      values={{
        title: values.title,
        description: values.description,
        totalPeriods: String(values.teacherProvided.totalPeriods),
        periodDurationMinutes: String(values.teacherProvided.periodDurationMinutes),
        pace: values.teacherProvided.pace,
        department: values.department,
      }}
    />
  );
}
