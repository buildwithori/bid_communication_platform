import { redirect } from 'next/navigation';

export default async function LegacyProgrammeModulePage({
  params,
}: {
  params: Promise<{ programmeId: string; moduleId: string }>;
}) {
  const { programmeId, moduleId } = await params;
  redirect(
    `/entrepreneur/training/${encodeURIComponent(programmeId)}?module=${encodeURIComponent(moduleId)}`,
  );
}
