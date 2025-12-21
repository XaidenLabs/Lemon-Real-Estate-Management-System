import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import Properties from "../../../components/user/search/Properties";
import { useProperty } from "../../../contexts/PropertyContext";
import FilterBottomSheet from "../../../components/user/FilterBottomSheet";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [userId, setUserId] = useState("");
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [page, setPage] = useState(1);

  const {
    propertyLoading,
    properties,
    getProperties,
    searchProperty,
    updateProperty,
    propertyMessage,
    setPropertyMessage,
    currentPage,
    totalPages,
  } = useProperty();

  const getUserId = async () => {
    return await AsyncStorage.getItem("userId");
  };

  useEffect(() => {
    const fetchUserId = async () => {
      const userId = await getUserId();
      setUserId(userId);
    };

    fetchUserId();
  }, []);

  const fetchProperties = async () => {
    await getProperties(page);
  };

  const fetchSearchedProperties = async (
    title,
    country,
    category,
    status,
    minPrice,
    maxPrice,
  ) => {
    await searchProperty(title, country, category, status, minPrice, maxPrice);
  };

  useEffect(() => {
    const isAllFieldsEmpty = () => {
      return (
        !searchQuery &&
        !country &&
        !category &&
        !status &&
        !minPrice &&
        !maxPrice
      );
    };

    if (isAllFieldsEmpty()) {
      fetchProperties();
    } else {
      fetchSearchedProperties(
        searchQuery,
        country,
        category,
        status,
        minPrice,
        maxPrice,
      );
    }
  }, [searchQuery, country, category, status, minPrice, maxPrice]);

  return (
    <SafeAreaView className="h-full bg-darkUmber-dark">
      <ScrollView showsVerticalScrollIndicator={false} className="p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-rbold text-white">Search</Text>
          <TouchableOpacity
            className="bg-frenchGray-dark items-center justify-center w-[50px] h-[50px] rounded-full"
            onPress={() => router.push("/user/properties/saved")}
          >
            <Ionicons name="heart-outline" size={23} color={"#FFFFFF"} />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between w-full">
          <TextInput
            placeholder="Search for properties..."
            className="bg-frenchGray-light text-white p-2 rounded-lg font-rregular flex-1"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
          />
          {/* <TouchableOpacity
                        className="bg-chartreuse items-center justify-center w-[40px] h-[40px] rounded-lg ml-2"
                        onPress={() => setIsBottomSheetOpen(true)}
                    >
                        <Ionicons name="filter" size={20} color="#212A2B" />
                    </TouchableOpacity> */}
        </View>

        {propertyLoading ? (
          <View className="mt-[100px]">
            <ActivityIndicator size="large" color="#BBCC13" />
          </View>
        ) : (
          <Properties
            properties={properties}
            updateProperty={updateProperty}
            propertyMessage={propertyMessage}
            setPropertyMessage={setPropertyMessage}
            userId={userId}
            setPage={setPage}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        )}

        <View className="mt-[90px]" />
      </ScrollView>

      {isBottomSheetOpen && (
        <FilterBottomSheet
          isBottomSheetOpen={isBottomSheetOpen}
          setIsBottomSheetOpen={setIsBottomSheetOpen}
          country={country}
          setCountry={setCountry}
          category={category}
          setCategory={setCategory}
          status={status}
          setStatus={setStatus}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          fetchSearchedProperties={fetchSearchedProperties}
        />
      )}
    </SafeAreaView>
  );
};

export default Search;
