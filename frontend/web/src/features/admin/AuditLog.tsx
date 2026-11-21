import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { DataTable, PageHeader } from '@/components/ui';
import { dateTime } from '@/lib/format';

export function AuditLog() {
  const { data = [] } = useQuery({ queryKey: ['audit'], queryFn: api.listAudit });
  return (
    <>
      <PageHeader title="Audit log" />
      <DataTable
        rows={data}
        rowKey={(a) => a.id}
        columns={[
          { header: 'When', cell: (a) => dateTime(a.at) },
          { header: 'Who', cell: (a) => a.userName },
          { header: 'Action', cell: (a) => a.action },
          { header: 'Entity', cell: (a) => a.entity },
        ]}
      />
    </>
  );
}
