import { useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";
import Button from "../../../components/agent/profile/Button";

const Profile = () => {
  const { getUser, user, logout } = useAuth();

  useEffect(() => {
    const getUserDetails = async () => {
      await getUser();
    };

    getUserDetails();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-darkUmber-dark">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View className="relative bg-frenchGray-dark h-[300px] items-center justify-center rounded-b-3xl">
          {user?.profilePicture ? (
            <Image
              source={{ uri: user.profilePicture }}
              className="w-24 h-24 rounded-full mb-2"
              resizeMode="cover"
            />
          ) : (
            <View className="bg-white rounded-full p-[20px]">
              <Ionicons name="person-outline" color={"#2B3B3C"} size={70} />
            </View>
          )}

          <Text className="text-white text-2xl font-rbold">
            {user.companyName}
          </Text>
          <Text className="text-white text-base font-rregular">
            {user.email}
          </Text>

          <TouchableOpacity
            className="absolute top-[10px] right-[20px] bg-transparentWhite items-center justify-center w-[50px] h-[50px] rounded-full"
            onPress={async () => await logout()}
          >
            <Ionicons name="log-out-outline" size={23} color={"#FFFFFF"} />
          </TouchableOpacity>

          <TouchableOpacity
            className="absolute top-[10px] left-[20px] bg-transparentWhite items-center justify-center w-[50px] h-[50px] rounded-full"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back-outline" size={23} color={"#FFFFFF"} />
          </TouchableOpacity>
        </View>

        <View className="p-4">
          <Button
            icon="person-outline"
            text="My Account"
            onClick={() => router.push("/agent/profile/edit")}
          />
          <Button
            icon="lock-closed-outline"
            text="Privacy policy"
            onClick={() =>
              Linking.openURL("https://lemon-theta-seven.vercel.app")
            }
          />
          <Button
            icon="document-text-outline"
            text="Terms and conditions"
            onClick={() =>
              Linking.openURL("https://lemon-theta-seven.vercel.app")
            }
          />
          <Button
            icon="id-card-outline"
            text="Verify your ID"
            onClick={() => router.push("/agent/verify-id")}
          />
          <Button
            icon="card-outline"
            text="Subscription"
            onClick={() => router.push("/agent/subscription")}
          />
          <Button
            icon="log-out-outline"
            text="Sign out"
            onClick={async () => await logout()}
          />
        </View>

        <View className="mb-[40px]" />
      </ScrollView>

      <StatusBar backgroundColor={"#3D454B"} />
    </SafeAreaView>
  );
};

export default Profile;
