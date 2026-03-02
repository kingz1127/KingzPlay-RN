import React from "react";
import Slider from "@react-native-community/slider";
import { View } from "react-native";
import styles from "../../styles/PlayerScreen.styles";

export default function SeekBar({
  durationMillis,
  positionMillis,
  onSlidingComplete,
}) {
  return (
    <View >
      <Slider style={styles.seekBar}
        minimumValue={0}
        maximumValue={durationMillis || 1}
        value={positionMillis}
        onSlidingComplete={onSlidingComplete}
        minimumTrackTintColor="#f6f7f8"
        maximumTrackTintColor="#ccc"
        thumbTintColor="#971db9"
      />
    </View>
  );
}
