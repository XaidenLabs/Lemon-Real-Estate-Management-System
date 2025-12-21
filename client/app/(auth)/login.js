import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import Button from "../../components/common/Button";
import { useAuth } from "../../contexts/AuthContext";
import ErrorOrMessageModal from "../../components/common/ErrorOrMessageModal";

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const {
    authLoading,
    authError,
    setAuthError,
    authMessage,
    setAuthMessage,
    login,
  } = useAuth();

  // Keep track of whether we should show email notification message
  const [showEmailNotice, setShowEmailNotice] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAuthError("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [authError]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAuthMessage("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [authMessage]);

  return (
    <View className="flex-1">
      <LinearGradient
        colors={["#212A2B", "#1A1F20", "#0F1720"]}
        locations={[0, 0.4, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                padding: 20,
              }}
              showsVerticalScrollIndicator={false}
            >
              {authError && (
                <ErrorOrMessageModal
                  visible={authError !== ""}
                  modalType="error"
                  onClose={() => setAuthError("")}
                  text={authError}
                />
              )}

              {authMessage && (
                <ErrorOrMessageModal
                  visible={authMessage !== ""}
                  modalType="success"
                  onClose={() => setAuthMessage("")}
                  text={`${authMessage}${
                    showEmailNotice
                      ? "\n\nWe've sent you a login notification email."
                      : ""
                  }`}
                />
              )}

              <Animated.View
                entering={FadeInDown.delay(200).duration(1000).springify()}
                className="w-full"
              >
                {/* Glass Container */}
                <View
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: 24,
                    padding: 24,
                    marginTop: 20,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <View className="mx-auto w-full mb-8">
                    <Text className="text-chartreuse text-3xl font-rbold mb-2 text-center">
                      Welcome Back
                    </Text>
                    <Text className="text-gray-400 text-center font-rregular text-base">
                      Sign in to access your account
                    </Text>
                  </View>

                  {/* Email Input */}
                  <View className="mb-4">
                    <Text className="text-gray-300 font-rmedium mb-2 ml-1">
                      Email Address
                    </Text>
                    <View
                      className={`flex-row items-center bg-[#2B3B3C] rounded-xl border ${
                        isEmailFocused
                          ? "border-chartreuse"
                          : "border-transparent"
                      } h-14 px-4 transition-all`}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={isEmailFocused ? "#BBCC13" : "#9CA3AF"}
                      />
                      <TextInput
                        placeholder="Enter your email"
                        className="flex-1 text-white ml-3 font-rregular text-base"
                        placeholderTextColor="#6B7280"
                        value={credentials.email}
                        onChangeText={(text) =>
                          setCredentials({ ...credentials, email: text })
                        }
                        onFocus={() => setIsEmailFocused(true)}
                        onBlur={() => setIsEmailFocused(false)}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  {/* Password Input */}
                  <View className="mb-6">
                    <Text className="text-gray-300 font-rmedium mb-2 ml-1">
                      Password
                    </Text>
                    <View
                      className={`flex-row items-center bg-[#2B3B3C] rounded-xl border ${
                        isPasswordFocused
                          ? "border-chartreuse"
                          : "border-transparent"
                      } h-14 px-4`}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={isPasswordFocused ? "#BBCC13" : "#9CA3AF"}
                      />
                      <TextInput
                        placeholder="Enter your password"
                        secureTextEntry={!showPassword}
                        className="flex-1 text-white ml-3 font-rregular text-base"
                        placeholderTextColor="#6B7280"
                        value={credentials.password}
                        onChangeText={(text) =>
                          setCredentials({ ...credentials, password: text })
                        }
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword((prev) => !prev)}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      className="mt-3 self-end"
                      onPress={() => router.push("/forgot-password")}
                    >
                      <Text className="text-chartreuse text-sm font-rmedium pr-1">
                        Forgot password?
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Login Button */}
                  <View className="mt-2 mb-4">
                    <Button
                      text="Sign In"
                      bg={true}
                      isLoading={authLoading}
                      onPress={async () => {
                        if (
                          credentials.email === "" ||
                          credentials.password === ""
                        ) {
                          return setAuthError("Input fields must not be empty");
                        }
                        await login(credentials);
                      }}
                    />
                  </View>

                  {/* Signup Link */}
                  <View className="flex-row justify-center mt-4">
                    <Text className="text-gray-400 font-rregular">
                      Don't have an account?{" "}
                    </Text>
                    <TouchableOpacity onPress={() => router.push("/signup")}>
                      <Text className="text-chartreuse font-rsemibold">
                        Sign Up
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

export default Login;
