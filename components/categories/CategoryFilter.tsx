import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import type { BusinessCategory } from '../../api/business';

interface CategoryFilterProps {
  categories: BusinessCategory[];
  selectedCategory: string;
  onSelectCategory: (categorySlug: string) => void;
  loading?: boolean;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  hairdresser: 'cut-outline',
  doctor: 'medical-outline',
  beauty: 'sparkles-outline',
  spa: 'leaf-outline',
  fitness: 'barbell-outline',
  other: 'ellipsis-horizontal-outline',
};

// ✅ React.memo - zapobiega re-renderom gdy props się nie zmieniają
const CategoryFilter: React.FC<CategoryFilterProps> = memo(({
  categories,
  selectedCategory,
  onSelectCategory,
  loading = false,
}) => {
  const allCategory = {
    slug: 'all',
    name: 'Wszystkie',
    count: categories.reduce((sum, cat) => sum + cat.count, 0),
  };

  const allCategories = [allCategory, ...categories];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {allCategories.map((category) => {
          const isSelected = selectedCategory === category.slug;
          const icon = CATEGORY_ICONS[category.slug] || 'business-outline';

          return (
            <TouchableOpacity
              key={category.slug}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
              ]}
              onPress={() => onSelectCategory(category.slug)}
              disabled={loading}
            >
              <View style={styles.chipContent}>
                <Ionicons
                  name={icon}
                  size={18}
                  color={isSelected ? '#fff' : Colors.accent}
                />
                <Text
                  style={[
                    styles.categoryName,
                    isSelected && styles.categoryNameSelected,
                  ]}
                >
                  {category.name}
                </Text>
                {category.count > 0 && (
                  <View
                    style={[
                      styles.badge,
                      isSelected && styles.badgeSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isSelected && styles.badgeTextSelected,
                      ]}
                    >
                      {category.count}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison - re-render TYLKO gdy te props się zmienią
  return (
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.loading === nextProps.loading &&
    prevProps.categories.length === nextProps.categories.length
  );
});

CategoryFilter.displayName = 'CategoryFilter';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  categoryNameSelected: {
    color: '#fff',
  },
  badge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  badgeTextSelected: {
    color: '#fff',
  },
});

export default CategoryFilter;