import { useEffect, useState } from "react";
import { ScrollView, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "../../../components/user/Header";
import Categories from "../../../components/user/Categories";
import NewListings from "../../../components/user/NewListings";
import Status from "../../../components/user/Status";
import { useProperty } from "../../../contexts/PropertyContext";
import NoProperties from "../../../components/user/NoProperties";
import SponsoredProperties from "../../../components/user/SponsoredProperties";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OnboardingTutorial from "../../../components/common/OnboardingTutorial";

const USER_KEY = "onboarding_seen_v1";

const Home = () => {
  const { getProperties, properties } = useProperty();
  const [showTutorial, setShowTutorial] = useState(false);
  const [loadingTutorialFlag, setLoadingTutorialFlag] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      await getProperties();
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const role = await AsyncStorage.getItem("role");
        const seen = await AsyncStorage.getItem(USER_KEY);

        // only show if user is not an agent and hasn't seen it
        if (mounted) {
          if (role !== "agent" && seen !== "true") {
            setShowTutorial(true);
          } else {
            setShowTutorial(false);
          }
        }
      } catch (err) {
        console.warn("Error reading onboarding flag:", err);
        // safer default: show tutorial
        if (mounted) setShowTutorial(true);
      } finally {
        if (mounted) setLoadingTutorialFlag(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // helpful dev helper to reset the flag during testing (call from UI as needed)
  const resetTutorialFlag = async () => {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      Alert.alert(
        "Tutorial flag cleared",
        "Restart the app or re-open Home to see the tutorial again.",
      );
    } catch (e) {
      console.warn("resetTutorialFlag error", e);
      Alert.alert("Error", "Could not clear tutorial flag.");
    }
  };

  return (
    <SafeAreaView className="h-full bg-darkUmber-dark">
      {/* explicitly pass role="user" and controlled visibility */}
      <OnboardingTutorial
        role="user"
        visible={showTutorial}
        onDone={() => setShowTutorial(false)}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Header />
        {properties.length === 0 ? (
          <NoProperties type="none" />
        ) : (
          <>
            <SponsoredProperties />
            <Categories />
            <Status />
            <NewListings />
          </>
        )}
        <View className="mt-[70px]" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;
