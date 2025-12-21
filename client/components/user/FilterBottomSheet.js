import { useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Modal,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const { height } = Dimensions.get("window");

const FilterBottomSheet = ({
  isBottomSheetOpen,
  setIsBottomSheetOpen,
  country,
  setCountry,
  category,
  setCategory,
  status,
  setStatus,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  fetchSearchedProperties,
}) => {
  const slideAnim = new Animated.Value(isBottomSheetOpen ? 0 : height);

  const toggleBottomSheet = (open) => {
    Animated.timing(slideAnim, {
      toValue: open ? 0 : height,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    toggleBottomSheet(isBottomSheetOpen);
  }, [isBottomSheetOpen]);

  const handleApplyFilters = () => {
    fetchSearchedProperties("", country, category, status, minPrice, maxPrice);
    setIsBottomSheetOpen(false);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isBottomSheetOpen}
      onRequestClose={() => setIsBottomSheetOpen(false)}
    >
      <View className="flex-1 justify-end bg-transparentBlack">
        <TouchableOpacity
          className="absolute top-0 left-0 right-0 bottom-0"
          onPress={() => setIsBottomSheetOpen(false)}
        />

        <View className="bg-darkUmber-dark rounded-t-3xl p-4 h-[470px]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-rbold">
              Filter Options
            </Text>
            <TouchableOpacity onPress={() => setIsBottomSheetOpen(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-frenchGray-light mb-2 font-rregular">
              Country
            </Text>
            <TextInput
              placeholder="Enter country"
              value={country}
              onChangeText={setCountry}
              className="bg-frenchGray-dark text-white p-2 rounded-lg font-rregular"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View className="mb-4">
            <Text className="text-frenchGray-light mb-2 font-rregular">
              Description or Keywords
            </Text>
            <TextInput
              placeholder="e.g., duplex, bungalow, 3 bedroom..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="bg-frenchGray-dark text-white p-2 rounded-lg font-rregular"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View className="mb-4">
            <Text className="text-frenchGray-light mb-2 font-rregular">
              Category
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {[
                "Lands",
                "Houses",
                "Shop Spaces",
                "Office Buildings",
                "Industrial Buildings",
              ].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-3 py-1 rounded-full ${
                    category === cat ? "bg-chartreuse" : "bg-frenchGray-dark"
                  }`}
                >
                  <Text
                    className={`font-rregular ${
                      category === cat ? "text-darkUmber-dark" : "text-white"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-frenchGray-light mb-2 font-rregular">
              Status
            </Text>
            <TextInput
              placeholder="Lease, Rent, Sale"
              value={status}
              onChangeText={setStatus}
              className="bg-frenchGray-dark text-white p-2 rounded-lg font-rregular"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-frenchGray-light mb-2 font-rregular">
                Min Price
              </Text>
              <TextInput
                placeholder="Min Price"
                value={minPrice}
                onChangeText={setMinPrice}
                className="bg-frenchGray-dark text-white p-2 rounded-lg font-rregular"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-frenchGray-light mb-2 font-rregular">
                Max Price
              </Text>
              <TextInput
                placeholder="Max Price"
                value={maxPrice}
                onChangeText={setMaxPrice}
                className="bg-frenchGray-dark text-white p-2 rounded-lg font-rregular"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleApplyFilters}
            className="bg-chartreuse p-3 rounded-lg items-center"
          >
            <Text className="text-darkUmber-dark text-lg font-rsemibold">
              Apply Filters
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default FilterBottomSheet;
