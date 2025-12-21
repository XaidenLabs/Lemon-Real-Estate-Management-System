import React, { useEffect } from "react";
import { StatusBar, View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import * as NavigationBar from "expo-navigation-bar"; // Disabled to prevent edge-to-edge warnings
import { LinearGradient } from "expo-linear-gradient";
import { images } from "../assets/constants";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  // interpolate, // usage replaced causing issues
  Easing,
} from "react-native-reanimated";
import GetStartedCTA from "../components/common/GetStartedCTA";

const SplashScreen = () => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Platform.OS === "android" logic removed as NavigationBar causes warnings with edge-to-edge

    // Sequence for logo: fade in + slight scale up
    opacity.value = withTiming(1, {
      duration: 1000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // default ease
    });

    // Scale with slight back-out effect
    scale.value = withTiming(1, {
      duration: 1200,
      easing: Easing.bezier(0.34, 1.3, 0.64, 1), // approx back-out
    });

    // Text fades in slightly later
    textOpacity.value = withDelay(
      800,
      withTiming(1, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // default ease
      })
    );

    // Continuous float animation after entrance
    scale.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(1.05, {
            duration: 2000,
            easing: Easing.bezier(0.37, 0, 0.63, 1), // ease-in-out-sine
          }),
          withTiming(1.0, {
            duration: 2000,
            easing: Easing.bezier(0.37, 0, 0.63, 1),
          })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    // interpolate(textOpacity.value, [0, 1], [20, 0]) equivalent:
    transform: [{ translateY: 20 * (1 - textOpacity.value) }],
  }));

  return (
    <View className="flex-1 bg-[#1A1F20]">
      <LinearGradient
        colors={["#212A2B", "#1A1F20", "#0F1720"]}
        locations={[0, 0.4, 1]}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <SafeAreaView className="flex-1 items-center justify-center w-full">
          {/* Logo Section */}
          <View className="items-center justify-center flex-1">
            <Animated.Image
              source={images.logo}
              resizeMode="contain"
              className="w-40 h-40 mb-6"
              style={animatedLogoStyle}
            />

            <Animated.Text
              style={[
                {
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 24,
                  color: "#FFFFFF",
                  letterSpacing: 0.5,
                  textAlign: "center",
                },
                animatedTextStyle,
              ]}
            >
              Find Your Perfect Space
            </Animated.Text>
          </View>

          {/* Show CTA — user must tap to proceed */}
          <View className="mb-8 w-full">
            <GetStartedCTA forceShow={true} />
          </View>

          <StatusBar
            translucent
            backgroundColor="transparent"
            barStyle="light-content"
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

export default SplashScreen;
