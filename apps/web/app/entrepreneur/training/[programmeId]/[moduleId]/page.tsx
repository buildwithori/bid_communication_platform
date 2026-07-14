import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function ModuleContentPage({
  params,
}: {
  params: { programmeId: string; moduleId: string };
}) {
  redirect(routes.entrepreneur.trainingProgram(params.programmeId));
}
