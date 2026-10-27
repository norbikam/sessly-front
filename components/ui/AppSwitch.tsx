import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
  type SwitchProps,
} from 'react-native';
import Colors from '../../constants/Colors';

type Props = Pick<
  SwitchProps,
  'value' | 'onValueChange' | 'disabled' | 'trackColor' | 'thumbColor'
>;

/** RN Switch thumb is misaligned on web — use a simple custom toggle there. */
export default function AppSwitch({
  value = false,
  onValueChange,
  disabled,
  trackColor,
  thumbColor,
}: Props) {
  if (Platform.OS === 'web') {
    const on = Boolean(value);
    const trackOn = trackColor?.true || '#C4B5FD';
    const trackOff = trackColor?.false || '#CBD5E1';
    const thumb = on
      ? thumbColor || Colors.light.accent
      : thumbColor || '#f4f3f4';

    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: on, disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={() => onValueChange?.(!on)}
        style={[
          styles.webTrack,
          { backgroundColor: on ? trackOn : trackOff },
          disabled && styles.webDisabled,
        ]}
      >
        <View
          style={[
            styles.webThumb,
            { backgroundColor: thumb, left: on ? 23 : 3 },
          ]}
        />
      </Pressable>
    );
  }

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={trackColor}
      thumbColor={thumbColor}
    />
  );
}

const styles = StyleSheet.create({
  webTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  webThumb: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  webDisabled: { opacity: 0.5 },
});
