import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const PropertiesOverviewCard = ({ icon, title, subTitle }) => {
  return (
    <View className="bg-frenchGray-dark rounded-xl p-4 mb-4 flex-row items-center">
      <Ionicons name={icon} size={30} color="#FFFFFF" />
      <View className="ml-4">
        <Text className="text-lg font-rregular text-white">{title}</Text>
        <Text className="text-4xl font-rbold text-white">{subTitle}</Text>
      </View>
    </View>
  );
};

const PropertiesOverview = ({
  numberOfProperties,
  propertiesForRent,
  propertiesForLease,
  propertiesForSale,
  totalRevenue,
}) => {
  return (
    <View className="flex-row flex-wrap justify-between">
      {/* Total Revenue Card */}
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
        className="w-[48%] p-4 rounded-2xl border mb-4"
      >
        <View className="flex-row justify-between items-start mb-2">
          <Ionicons name="wallet-outline" size={24} color="#BBCC13" />
          <View className="bg-[#2B3B3C] p-1 rounded-md">
            <Ionicons name="ellipsis-horizontal" size={16} color="#9CA3AF" />
          </View>
        </View>
        <Text className="text-white text-2xl font-rbold mb-1">
          ${(totalRevenue || 0).toLocaleString()}
        </Text>
        <Text className="text-chartreuse text-xs font-rregular">
          Lifetime Revenue
        </Text>
      </View>

      {/* Total Properties Card */}
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
        className="w-[48%] p-4 rounded-2xl border mb-4"
      >
        <View className="flex-row justify-between items-start mb-2">
          <Ionicons name="business-outline" size={24} color="#BBCC13" />
          <View className="bg-[#2B3B3C] p-1 rounded-md">
            <Ionicons name="ellipsis-horizontal" size={16} color="#9CA3AF" />
          </View>
        </View>
        <Text className="text-white text-2xl font-rbold mb-1">
          {numberOfProperties}
        </Text>
        <Text className="text-gray-400 text-xs font-rregular">
          Total Properties
        </Text>
      </View>

      {/* Sale Properties */}
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
        className="w-[48%] p-4 rounded-2xl border mb-4"
      >
        <Ionicons
          name="pricetag-outline"
          size={24}
          color="#BBCC13"
          className="mb-2"
        />
        <Text className="text-white text-2xl font-rbold mb-1">
          {propertiesForSale}
        </Text>
        <Text className="text-gray-400 text-xs font-rregular">For Sale</Text>
      </View>

      {/* Rent/Lease Combined */}
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
        className="w-[48%] p-4 rounded-2xl border mb-4"
      >
        <Ionicons
          name="key-outline"
          size={24}
          color="#BBCC13"
          className="mb-2"
        />
        <Text className="text-white text-2xl font-rbold mb-1">
          {propertiesForRent + propertiesForLease}
        </Text>
        <Text className="text-gray-400 text-xs font-rregular">
          Rent & Lease
        </Text>
      </View>
    </View>
  );
};

export default PropertiesOverview;
