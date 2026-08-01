import { getPrincipalColumns } from '@/components/columns/principal';
import { DataTable } from '@/components/ui/data-table';
import { useGetPrincipals } from '@/hook/superadmin/get-all-admins';

export function AllPrincipalsPage() {
  const { data, isLoading, error } = useGetPrincipals();
  const principalColumns = getPrincipalColumns();

  if (isLoading) return <p>Loading principals...</p>;
  if (error) return <p>Error loading principals</p>;

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h1 className='text-lg font-semibold'>All Principals</h1>
      </div>

      <DataTable data={data?.data.admins || []} columns={principalColumns} />
    </div>
  );
}
