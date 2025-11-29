import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Simple skeleton loader with shimmer effect
 * No external dependencies - pure React Native
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Business Card Skeleton for HomeScreen
 */
export const BusinessCardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <SkeletonLoader width={48} height={48} borderRadius={12} />
        <View style={styles.cardInfo}>
          <SkeletonLoader width="60%" height={18} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="40%" height={14} />
        </View>
      </View>

      {/* Description */}
      <SkeletonLoader width="100%" height={14} style={{ marginBottom: 6 }} />
      <SkeletonLoader width="80%" height={14} style={{ marginBottom: 12 }} />

      {/* Info rows */}
      <SkeletonLoader width="50%" height={12} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="30%" height={12} style={{ marginBottom: 12 }} />

      {/* Actions */}
      <View style={styles.actionsRow}>
        <SkeletonLoader width={100} height={32} borderRadius={8} />
        <SkeletonLoader width={100} height={32} borderRadius={8} />
      </View>
    </View>
  );
};

/**
 * Service Card Skeleton for BusinessDetailScreen
 */
export const ServiceCardSkeleton: React.FC = () => {
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceInfo}>
        <SkeletonLoader width="60%" height={16} style={{ marginBottom: 8 }} />
        <View style={styles.serviceMeta}>
          <SkeletonLoader width={80} height={14} />
          <SkeletonLoader width={80} height={14} />
        </View>
      </View>
      <SkeletonLoader width={100} height={36} borderRadius={8} />
    </View>
  );
};

/**
 * List of Business Card Skeletons
 */
export const BusinessListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <BusinessCardSkeleton key={`skeleton-${index}`} />
      ))}
    </>
  );
};

/**
 * List of Service Card Skeletons
 */
export const ServiceListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ServiceCardSkeleton key={`skeleton-service-${index}`} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceMeta: {
    flexDirection: 'row',
    gap: 16,
  },
});