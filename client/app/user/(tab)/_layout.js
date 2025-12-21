import { View } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as NavigationBar from "expo-navigation-bar";

const TabIcon = ({ icon, focused }) => (
  <View
    className={`${focused ? "bg-[#212A2B]" : ""} mt-7 items-center justify-center w-[50px] h-[50px] rounded-full`}
  >
    <Ionicons
      name={icon}
      size={focused ? 23 : 20}
      color={focused ? "#BBCC13" : "#FFFFFF"}
    />
  </View>
);

const TabLayout = () => {
  NavigationBar.setBackgroundColorAsync("#2B3B3C");

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#191641",
        tabBarInactiveTintColor: "#808080",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 80,
          paddingVertical: 5,
          borderTopLeftRadius: 15,
          borderTopRightRadius: 15,
          backgroundColor: "#2B3B3C",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={"home-outline"}
              color={color}
              focused={focused}
              name="Home"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={"search-outline"} focused={focused} name="Search" />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="chats"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={"chatbubbles-outline"}
              color={color}
              focused={focused}
              name="Chats"
            />
          ),
        }}
      /> */}
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={"person-outline"}
              color={color}
              focused={focused}
              name="Profile"
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabLayout;
