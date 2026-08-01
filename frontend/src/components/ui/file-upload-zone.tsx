import { FileText, X } from 'lucide-react';
import { useCallback } from 'react';
import { type DropzoneOptions, useDropzone } from 'react-dropzone';
import { Button } from './button';

type DropzoneFieldProps = {
  value?: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  className?: string;
  placeholder?: string;
  options?: Omit<DropzoneOptions, 'maxFiles' | 'onDrop'>;
};

export function DropzoneField({
  value = [],
  onChange,
  maxFiles,
  className = '',
  placeholder = 'Only Images & PDF',
  options,
}: DropzoneFieldProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const merged = [...value, ...acceptedFiles].slice(0, maxFiles);
      onChange(merged);
    },
    [onChange, value, maxFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    ...options,
  });

  const removeAt = (idx: number) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  };

  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className='space-y-3'>
      <div
        {...getRootProps()}
        className={` flex flex-col justify-center border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors 
          ${isDragActive ? 'border-primary bg-muted/30' : 'border-muted-foreground/30'} 
          hover:bg-muted/50 ${className}`}
      >
        <input {...getInputProps()} />
        <p className='text-sm text-muted-foreground'>
          {isDragActive ? 'Drop files here…' : 'Drag & drop or click to upload'}
        </p>
        <p className='text-xs text-muted-foreground mt-1'>
          {placeholder} • Max {maxFiles} files
        </p>
      </div>

      {value.length > 0 && (
        <ul className='flex gap-3'>
          {value.map((file, i) => (
            <li key={`${file.name}-${i}`} className='relative'>
              <Button
                variant='secondary'
                size='sm'
                className='absolute rounded-full top-2 right-2 p-0 has-[>svg]:px-0 size-5 z-10'
                onClick={() => removeAt(i)}
              >
                <X className='h-4 w-4' />
              </Button>

              <div className='border rounded-md overflow-hidden'>
                {isImage(file) ? (
                  <div className='h-28 relative z-0'>
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className='absolute size-full bg-center object-cover'
                    />
                  </div>
                ) : (
                  <div className='h-24 flex flex-col items-center justify-center bg-muted'>
                    <FileText className='h-6 w-6 text-muted-foreground' />
                  </div>
                )}
              </div>

              <p className='mt-1 text-xs '>{file.name}</p>
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <Button variant='ghost' onClick={() => onChange([])}>
          Clear all
        </Button>
      )}
    </div>
  );
}
