import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

/** Alias of HelloWave — Ionicons only. */
export function HelloWave() {
  return (
    <Animated.View style={styles.wrap}>
      <Ionicons name="hand-left-outline" size={28} color="#8B5CF6" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: -4 },
});
