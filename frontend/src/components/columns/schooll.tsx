import type { ColumnDef } from '@tanstack/react-table';
import type { School } from '@/hook/superadmin/use-create-school';

export const schoolColumns: ColumnDef<School>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'type',
    header: 'Type',
  },
  {
    accessorKey: 'address',
    header: 'Address',
  },
];
