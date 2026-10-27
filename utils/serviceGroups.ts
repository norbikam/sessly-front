import type { Service, ServiceCategory } from '../types/api';

export type ServiceGroup = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  services: Service[];
};

export function buildServiceGroups(
  services: Service[],
  categories: ServiceCategory[] = [],
  uncategorizedLabel = 'Pozostałe',
): ServiceGroup[] {
  const sortedServices = [...services].sort((a, b) => {
    const order = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (order !== 0) return order;
    return (a.name || '').localeCompare(b.name || '', 'pl');
  });

  const fromCategories = [...categories]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'pl'))
    .map((category) => ({
      id: String(category.id),
      name: category.name,
      color: category.color || '#8B5CF6',
      sort_order: category.sort_order ?? 0,
      services: sortedServices.filter((service) => String(service.category?.id) === String(category.id)),
    }));

  const knownIds = new Set(fromCategories.map((item) => item.id));
  const orphanCategories = new Map<string, ServiceGroup>();
  for (const service of sortedServices) {
    const category = service.category;
    if (!category?.id || knownIds.has(String(category.id))) continue;
    const key = String(category.id);
    if (!orphanCategories.has(key)) {
      orphanCategories.set(key, {
        id: key,
        name: category.name || uncategorizedLabel,
        color: category.color || '#94A3B8',
        sort_order: 999,
        services: [],
      });
    }
    orphanCategories.get(key)!.services.push(service);
  }

  const uncategorized = sortedServices.filter((service) => !service.category?.id);
  const groups = [
    ...fromCategories,
    ...Array.from(orphanCategories.values()),
    {
      id: 'uncategorized',
      name: uncategorizedLabel,
      color: '#94A3B8',
      sort_order: 1000,
      services: uncategorized,
    },
  ];

  return groups.filter((group) => group.services.length > 0);
}

export function filterServiceGroups(groups: ServiceGroup[], query: string): ServiceGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((group) => ({
      ...group,
      services: group.services.filter((service) => {
        const haystack = [
          service.localized_name,
          service.name,
          service.localized_description,
          service.description,
          ...(service.options || []).map((item) => item.localized_name || item.name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }),
    }))
    .filter((group) => group.services.length > 0);
}
