import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';
import type { TextEditType } from '@/pages/dashboard/teacher/unit/edit-unit';

// type UnitFileUpdate={
//     unitId:string,
//     unitFile:file
// }
async function updateUnitText(unitid: string, data: TextEditType) {
  const res = await axios.put(`/units/${unitid}`, {
    title: data.title,
    description: data.description,
    learningObjectives: data.learningObjectives,
    teachingPlan: {
      overview: data.teachingPlan.overview,
      methods: data.teachingPlan.methods.map((method) => method.value),
      activities: data.teachingPlan.activities.map((activity) => activity.value),
    },
    estimatedTime: data.estimatedTime,
    status: data.status,
  });
  return res.data;
}

async function updateUnitFile(unitId: string, file: File) {
  const formData = new FormData();
  formData.append('unitId', unitId);
  formData.append('file', file);

  const res = await axios.post('/units/resource', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data;
}
export function useUpdateUnitFile(unitId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => updateUnitFile(unitId, file),
    onSuccess: () => {
      toast.success('File uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['course'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occurred while uploading file');
      } else {
        toast.error('Failed to upload file');
      }
    },
  });
}

const deleteUnit = async ({ id }: { id: string }) => {
  const response = await axios.delete(`/units/${id}`);
  return response.data;
};

export function useDeleteUnit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      toast.success('uniy deleted sucessfully');
      client.invalidateQueries({ queryKey: ['units'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occur while deleting unit');
      } else {
        toast.error('Failed to delete unit');
      }
    },
  });
}

export function useUpdateUnitText(unitid: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TextEditType) => updateUnitText(unitid, data),
    onSuccess: () => {
      toast.success('Unit updated successfully');
      queryClient.invalidateQueries({ queryKey: ['course'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occurred while updating unit');
      } else {
        toast.error('Failed to update unit');
      }
    },
  });
}
