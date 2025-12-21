import { useEffect, useState } from "react";
import { View, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../../components/agent/dashboard/Header";
import PropertiesOverview from "../../../components/agent/dashboard/PropertiesOverview";
import PropertiesAnalytics from "../../../components/agent/dashboard/PropertiesAnalytics";
import MetricsPanel from "../../../components/agent/dashboard/MetricsPanel";
import { useProperty } from "../../../contexts/PropertyContext";
import { useAuth } from "../../../contexts/AuthContext";
import OnboardingTutorial from "../../../components/common/OnboardingTutorial";

const AGENT_KEY = "onboarding_agent_seen_v1";

const Dashboard = () => {
  const { user } = useAuth();

  const [showTutorial, setShowTutorial] = useState(false);

  const {
    getProperties,
    numberOfProperties,
    agentRentProperties,
    agentLeaseProperties,
    agentSaleProperties,
    analytics,
  } = useProperty();

  useEffect(() => {
    const getPropertiesDetails = async () => {
      await getProperties();
    };
    getPropertiesDetails();
  }, []);

  useEffect(() => {
    const checkTutorial = async () => {
      try {
        const seen = await AsyncStorage.getItem(AGENT_KEY);
        if (!seen) {
          setShowTutorial(true); // only show if agent hasn’t seen it
        }
      } catch (err) {
        // in case of error, default to showing tutorial (safe fallback)
        setShowTutorial(true);
      }
    };

    checkTutorial();
  }, []);

  return (
    <View className="flex-1 bg-darkUmber-dark">
      <StatusBar backgroundColor="#212A2B" barStyle="light-content" />

      {/* Tutorial overlay for agents */}
      <OnboardingTutorial
        role="agent"
        visible={showTutorial}
        onDone={() => setShowTutorial(false)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        className="bg-darkUmber-dark"
      >
        <SafeAreaView className="flex-1">
          <View className="px-4 py-2 space-y-6">
            <Header />

            <MetricsPanel agentId={user?._id} />

            <View className="h-20" />
          </View>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
};

export default Dashboard;
