import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import * as z from 'zod';
import roleselection from '@/assets/assistant.png';
import { useTypingEffect } from '@/hook/use-typing-effect';
import { Button } from '../ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '../ui/field';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const roles = [
  {
    id: 'student',
    title: 'Student',
    description: 'Access learning materials, assignments, and track your progress.',
  },
  {
    id: 'teacher',
    title: 'Teacher',
    description: 'Create courses, manage students, and monitor their performance.',
  },
] as const;

const RoleEnum = z.enum(['student', 'teacher']);

const roleSchema = z.object({
  role: RoleEnum,
});

type RoleFormValues = z.infer<typeof roleSchema>;

export function RoleSelectionPage() {
  const typingText = useTypingEffect("What's your role?", 80);
  const navigate = useNavigate();
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      role: 'student',
    },
  });

  function onSubmit(data: RoleFormValues) {
    console.log('Selected role:', data);
    navigate(`/signup?role=${data.role}`);
  }

  return (
    <div className='container mx-7 py-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center justify-center shadow-xs'>
      <div className=''>
        <img src={roleselection} alt='Role selection' className='w-full  drop-shadow-xl rounded-2xl' />
      </div>

      <div className='space-y-6'>
        <h1 className='font-semibold text-blue-600 text-3xl leading-tight'>
          {typingText}
          <span className='inline-block ml-2 w-1 h-8 bg-blue-600 rounded-sm animate-pulse' />
        </h1>
        <p className='text-gray-600 text-base'>Tell us about your role so we can personalize your experience.</p>

        <div className='mt-4 space-y-6 shadow-md rounded-xl p-6 border'>
          <FieldGroup>
            <Controller
              name='role'
              control={form.control}
              render={({ field, fieldState }) => (
                <FieldSet data-invalid={fieldState.invalid}>
                  <FieldLegend className='text-lg font-semibold text-gray-800'>Select Your Role</FieldLegend>
                  <FieldDescription className='text-sm text-gray-600 mb-4'>
                    Choose the role that best describes you.
                  </FieldDescription>

                  <RadioGroup
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                    className='space-y-3'
                  >
                    {roles.map((role) => (
                      <FieldLabel key={role.id} htmlFor={`role-${role.id}`} className='cursor-pointer'>
                        <Field
                          orientation='horizontal'
                          data-invalid={fieldState.invalid}
                          className='rounded-lg border-2 border-gray-200 p-4 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50'
                        >
                          <FieldContent>
                            <FieldTitle className='text-base font-semibold text-gray-800'>{role.title}</FieldTitle>
                            <FieldDescription className='text-sm text-gray-600'>{role.description}</FieldDescription>
                          </FieldContent>
                          <RadioGroupItem
                            value={role.id}
                            id={`role-${role.id}`}
                            aria-invalid={fieldState.invalid}
                            className='shrink-0'
                          />
                        </Field>
                      </FieldLabel>
                    ))}
                  </RadioGroup>

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </FieldSet>
              )}
            />
          </FieldGroup>

          <div className='flex justify-center items-center pt-4'>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              className='w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2.5 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-200'
            >
              Continue To Signup →
            </Button>
          </div>

          <div className='pt-4 border-t border-gray-200'>
            <p className='text-xs text-gray-500 text-center font-medium'>
              Your role helps us customize your sign-up experience and recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
