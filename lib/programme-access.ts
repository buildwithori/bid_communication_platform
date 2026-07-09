import { contentItems, programs as seedPrograms } from '@/lib/mock-data/programs';
import { getProgrammeStatus } from '@/lib/programme-status';
import type { Entrepreneur, Program } from '@/types';

export const FREE_RESOURCE_ACCESS_LABEL = 'Free resources';
export const FREE_RESOURCE_ONLY_LABEL = 'Free resources only';

export const isProgrammeOperational = (programme: Program) =>
  getProgrammeStatus(programme) !== 'archived';

export const getFreeProgrammes = (programmes: Program[] = seedPrograms) =>
  programmes.filter((programme) => programme.accessType === 'free' && isProgrammeOperational(programme));

export const getAssignedProgrammes = (programmes: Program[] = seedPrograms) =>
  programmes.filter((programme) => programme.accessType !== 'free' && isProgrammeOperational(programme));

export function getEntrepreneurProgrammeIds(entrepreneur: Entrepreneur) {
  return Array.from(
    new Set([
      ...(entrepreneur.programmeIds ?? []),
      ...(entrepreneur.programmeId ? [entrepreneur.programmeId] : []),
    ]),
  );
}

export function getEntrepreneurProgrammes(
  entrepreneur: Entrepreneur,
  programmes: Program[] = seedPrograms,
) {
  return [
    ...getEntrepreneurAssignedProgrammes(entrepreneur, programmes),
    ...getFreeProgrammes(programmes),
  ];
}

function getProgrammeContentIds(programme: Program) {
  const moduleIds = new Set(programme.moduleIds);
  return contentItems
    .filter((item) => moduleIds.has(item.moduleId))
    .map((item) => item.id);
}

export function getEntrepreneurContentIds(entrepreneur: Entrepreneur) {
  if (entrepreneur.contentItemIds?.length) return Array.from(new Set(entrepreneur.contentItemIds));

  const legacyProgrammeIds = getEntrepreneurProgrammeIds(entrepreneur);
  return Array.from(
    new Set(
      seedPrograms
        .filter((programme) => legacyProgrammeIds.includes(programme.id))
        .flatMap((programme) => getProgrammeContentIds(programme)),
    ),
  );
}

export function getEntrepreneurAssignedProgrammes(
  entrepreneur: Entrepreneur,
  programmes: Program[] = seedPrograms,
) {
  const contentIds = new Set(getEntrepreneurContentIds(entrepreneur));
  return programmes.filter((programme) => {
    if (!isProgrammeOperational(programme) || programme.accessType === 'free') return false;
    return getProgrammeContentIds(programme).some((contentId) => contentIds.has(contentId));
  });
}

export function hasFormalProgramme(entrepreneur: Entrepreneur) {
  return getEntrepreneurAssignedProgrammes(entrepreneur).length > 0;
}

export function getPrimaryProgramme(
  entrepreneur: Entrepreneur,
  programmes: Program[] = seedPrograms,
) {
  return getEntrepreneurProgrammes(entrepreneur, programmes)[0];
}

export function formatProgrammeAccess(
  entrepreneur: Entrepreneur,
  programmes: Program[] = seedPrograms,
) {
  const assignedProgrammes = getEntrepreneurAssignedProgrammes(entrepreneur, programmes);
  const freeProgrammes = getFreeProgrammes(programmes);
  const freeLabel =
    freeProgrammes.length > 0
      ? `${freeProgrammes.length} free programme${freeProgrammes.length === 1 ? '' : 's'}`
      : FREE_RESOURCE_ACCESS_LABEL;
  if (assignedProgrammes.length === 0) return freeLabel;
  const visibleNames = assignedProgrammes.slice(0, 2).map((programme) => programme.name).join(', ');
  const hiddenCount = assignedProgrammes.length - 2;
  return hiddenCount > 0
    ? `${visibleNames} + ${hiddenCount} more + ${freeLabel}`
    : `${visibleNames} + ${freeLabel}`;
}

export function entrepreneurHasProgramme(
  entrepreneur: Entrepreneur,
  programmeId: string,
  programmes: Program[] = seedPrograms,
) {
  const programme = programmes.find((item) => item.id === programmeId);
  if (!programme || !isProgrammeOperational(programme)) return false;
  if (programme.accessType === 'free') return true;
  const contentIds = new Set(getEntrepreneurContentIds(entrepreneur));
  return getProgrammeContentIds(programme).some((contentId) => contentIds.has(contentId));
}
