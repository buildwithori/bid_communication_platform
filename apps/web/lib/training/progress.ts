import type { Module, ContentItem, ModuleWithProgress } from '@/types';
import { contentForModule } from '@/lib/mock-data/programs';

/**
 * Derives an entrepreneur-facing module's progress + status from the
 * progress of its content items. In a real backend this would be a
 * per-learner module_progress row; here it is computed from seed data.
 */
export function moduleWithProgress(module: Module): ModuleWithProgress {
  const items = contentForModule(module.id);
  const total = items.length || 1;
  const done = items.filter((c) => c.progress === 'completed').length;
  const inProgress = items.some((c) => c.progress === 'in-progress');
  const progress = Math.round((done / total) * 100);

  let status: ModuleWithProgress['status'] = 'not-started';
  if (done === items.length && items.length > 0) status = 'completed';
  else if (done > 0 || inProgress) status = 'in-progress';

  return { ...module, status, progress };
}

export function contentProgressPercent(items: ContentItem[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((c) => c.progress === 'completed').length;
  return Math.round((done / items.length) * 100);
}
