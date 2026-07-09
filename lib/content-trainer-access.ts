import { contentItems, modules, programs } from '@/lib/mock-data/programs';
import { trainers } from '@/lib/mock-data/trainers';
import { isProgrammeOperational } from '@/lib/programme-access';
import type { ContentItem, Entrepreneur, Program, Trainer } from '@/types';

export function getProgrammeContentItems(programme: Program, items: ContentItem[] = contentItems) {
  const moduleIds = new Set(programme.moduleIds);
  return items.filter((item) => {
    const module = modules.find((candidate) => candidate.id === item.moduleId);
    return module ? moduleIds.has(module.id) : false;
  });
}

export function getEntrepreneurAccessibleContentIds(entrepreneur: Entrepreneur) {
  if (entrepreneur.contentItemIds?.length) {
    return Array.from(new Set(entrepreneur.contentItemIds));
  }

  const legacyProgrammeIds = Array.from(
    new Set([
      ...(entrepreneur.programmeIds ?? []),
      ...(entrepreneur.programmeId ? [entrepreneur.programmeId] : []),
    ]),
  );

  return programs
    .filter((programme) => legacyProgrammeIds.includes(programme.id))
    .flatMap((programme) => getProgrammeContentItems(programme).map((item) => item.id));
}

export function getEntrepreneurAccessibleContent(entrepreneur: Entrepreneur) {
  const ids = new Set(getEntrepreneurAccessibleContentIds(entrepreneur));
  return contentItems.filter((item) => ids.has(item.id));
}

export function getProgrammesFromContentIds(contentIds: string[], programmeList: Program[] = programs) {
  const contentSet = new Set(contentIds);
  return programmeList.filter((programme) => {
    if (!isProgrammeOperational(programme)) return false;
    return getProgrammeContentItems(programme).some((item) => contentSet.has(item.id));
  });
}

export function getEntrepreneurProgrammesFromContent(entrepreneur: Entrepreneur, programmeList: Program[] = programs) {
  return getProgrammesFromContentIds(getEntrepreneurAccessibleContentIds(entrepreneur), programmeList);
}

export function getTrainerContentItems(trainerId: string) {
  return contentItems.filter((item) => item.trainerId === trainerId);
}

export function getTrainerProgrammes(trainerId: string, programmeList: Program[] = programs) {
  const trainerContentIds = getTrainerContentItems(trainerId).map((item) => item.id);
  return getProgrammesFromContentIds(trainerContentIds, programmeList).filter((programme) => programme.accessType !== 'free');
}

export function trainerSupportsEntrepreneur(trainerId: string, entrepreneur: Entrepreneur) {
  const trainerContentIds = new Set(getTrainerContentItems(trainerId).map((item) => item.id));
  return getEntrepreneurAccessibleContentIds(entrepreneur).some((contentId) => trainerContentIds.has(contentId));
}

export function getEntrepreneurTrainerIds(entrepreneur: Entrepreneur) {
  return Array.from(
    new Set(
      getEntrepreneurAccessibleContent(entrepreneur)
        .map((item) => item.trainerId)
        .filter(Boolean) as string[],
    ),
  );
}

export function getEntrepreneurTrainers(entrepreneur: Entrepreneur): Trainer[] {
  const ids = new Set(getEntrepreneurTrainerIds(entrepreneur));
  return trainers.filter((trainer) => ids.has(trainer.id));
}

export function getContentTrainer(contentId: string) {
  const content = contentItems.find((item) => item.id === contentId);
  return content?.trainerId ? trainers.find((trainer) => trainer.id === content.trainerId) : undefined;
}
