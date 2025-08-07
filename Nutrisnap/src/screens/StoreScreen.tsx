import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';

// Import types
import { RootStackParamList } from '../types';

// Import API
import { getCurrentUser, getData, updateData } from '../api/supabase';

// Import translations
import { en, id } from '../translations';

// Import components
import KoalaCharacter from '../components/KoalaCharacter';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type StoreScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Store'>;

// Store item types
type StoreItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  imageUrl?: string;
  category: 'catering' | 'fitness' | 'supplements' | 'promo';
  featured: boolean;
};

// Premium code type
type PremiumCode = {
  code: string;
  used: boolean;
  usedBy?: string;
  usedAt?: string;
};

const StoreScreen: React.FC = () => {
  const navigation = useNavigation<StoreScreenNavigationProp>();
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('id');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [featuredItems, setFeaturedItems] = useState<StoreItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [premiumCode, setPremiumCode] = useState<string>('');
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [activatingPremium, setActivatingPremium] = useState<boolean>(false);
  const [koalaExpression, setKoalaExpression] = useState<string>('neutral');
  const [koalaMessage, setKoalaMessage] = useState<string>('');
  
  // Set i18n locale
  useEffect(() => {
    const getLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('language');
        if (savedLanguage) {
          setLanguage(savedLanguage);
          i18n.locale = savedLanguage;
        }
      } catch (e) {
        console.error('Failed to get language preference', e);
      }
    };
    
    getLanguage();
  }, []);
  
  // Load user data and store items
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data, error } = await getCurrentUser();
      
      if (error) {
        throw error;
      }
      
      if (data?.user) {
        setUserId(data.user.id);
        
        // Get user profile data from database
        const { data: userData, error: userError } = await getData('users', 'id', data.user.id);
        
        if (userError) {
          throw userError;
        }
        
        if (userData && userData.length > 0) {
          setIsPremium(userData[0].isPremium || false);
          
          // Set koala expression based on premium status
          if (userData[0].isPremium) {
            setKoalaExpression('excited');
            setKoalaMessage(i18n.t('premiumStoreMessage'));
          } else {
            setKoalaExpression('happy');
            setKoalaMessage(i18n.t('regularStoreMessage'));
          }
        }
        
        // Get store items
        const { data: storeData, error: storeError } = await getData('store_items', null, null);
        
        if (storeError) {
          throw storeError;
        }
        
        if (storeData) {
          // Sort store items by category and then by price
          const sortedItems = [...storeData].sort((a, b) => {
            // First sort by category
            if (a.category !== b.category) {
              const categoryOrder = { catering: 0, fitness: 1, supplements: 2, promo: 3 };
              return categoryOrder[a.category] - categoryOrder[b.category];
            }
            
            // Then sort by price (lowest first)
            const aPrice = a.discountPrice || a.price;
            const bPrice = b.discountPrice || b.price;
            return aPrice - bPrice;
          });
          
          setStoreItems(sortedItems);
          
          // Set featured items
          const featured = sortedItems.filter(item => item.featured);
          setFeaturedItems(featured);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(i18n.t('error'), i18n.t('loadDataError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Filter store items by category
  const filteredItems = selectedCategory === 'all' 
    ? storeItems 
    : storeItems.filter(item => item.category === selectedCategory);
  
  // Handle item purchase
  const handlePurchase = (item: StoreItem) => {
    // Open WhatsApp with predefined message
    const message = `${i18n.t('whatsappOrderMessage')} ${item.name} (${i18n.t('price')}: Rp ${item.discountPrice || item.price})`;
    const whatsappUrl = `https://wa.me/081260421586?text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          Alert.alert(i18n.t('error'), i18n.t('whatsappNotInstalled'));
        }
      })
      .catch(err => {
        console.error('Error opening WhatsApp:', err);
        Alert.alert(i18n.t('error'), i18n.t('whatsappError'));
      });
  };
  
  // Handle premium code activation
  const handleActivatePremium = async () => {
    if (!premiumCode.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('enterPremiumCode'));
      return;
    }
    
    try {
      setActivatingPremium(true);
      
      // Check if code exists and is unused
      const { data: codeData, error: codeError } = await getData('premium_codes', 'code', premiumCode.trim());
      
      if (codeError) {
        throw codeError;
      }
      
      if (!codeData || codeData.length === 0) {
        Alert.alert(i18n.t('error'), i18n.t('invalidPremiumCode'));
        return;
      }
      
      const premiumCodeData = codeData[0] as PremiumCode;
      
      if (premiumCodeData.used) {
        Alert.alert(i18n.t('error'), i18n.t('premiumCodeAlreadyUsed'));
        return;
      }
      
      // Update premium code as used
      const now = new Date().toISOString();
      const { error: updateCodeError } = await updateData('premium_codes', premiumCodeData.code, {
        used: true,
        usedBy: userId,
        usedAt: now,
      });
      
      if (updateCodeError) {
        throw updateCodeError;
      }
      
      // Update user as premium
      if (userId) {
        const { error: updateUserError } = await updateData('users', userId, {
          isPremium: true,
          premiumActivatedAt: now,
        });
        
        if (updateUserError) {
          throw updateUserError;
        }
        
        // Update local state
        setIsPremium(true);
        setShowPremiumModal(false);
        setPremiumCode('');
        
        // Show success message
        Alert.alert(
          i18n.t('congratulations'),
          i18n.t('premiumActivated'),
          [{ text: i18n.t('great'), style: 'default' }]
        );
        
        // Update koala expression
        setKoalaExpression('excited');
        setKoalaMessage(i18n.t('premiumStoreMessage'));
      }
    } catch (error) {
      console.error('Error activating premium:', error);
      Alert.alert(i18n.t('error'), i18n.t('premiumActivationError'));
    } finally {
      setActivatingPremium(false);
    }
  };
  
  // Buy premium code via WhatsApp
  const buyPremiumCode = () => {
    const message = i18n.t('whatsappPremiumMessage');
    const whatsappUrl = `https://wa.me/081260421586?text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          Alert.alert(i18n.t('error'), i18n.t('whatsappNotInstalled'));
        }
      })
      .catch(err => {
        console.error('Error opening WhatsApp:', err);
        Alert.alert(i18n.t('error'), i18n.t('whatsappError'));
      });
  };
  
  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };
  
  // Load data on screen focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );
  
  // Render category selector
  const renderCategorySelector = () => {
    const categories = [
      { id: 'all', name: i18n.t('allCategories'), icon: 'apps-outline' },
      { id: 'catering', name: i18n.t('catering'), icon: 'restaurant-outline' },
      { id: 'fitness', name: i18n.t('fitness'), icon: 'barbell-outline' },
      { id: 'supplements', name: i18n.t('supplements'), icon: 'fitness-outline' },
      { id: 'promo', name: i18n.t('promos'), icon: 'pricetag-outline' },
    ];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryButton, selectedCategory === category.id && styles.selectedCategory]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons 
              name={category.icon as any} 
              size={18} 
              color={selectedCategory === category.id ? '#fff' : '#FF5722'} 
            />
            <Text 
              style={[styles.categoryText, selectedCategory === category.id && styles.selectedCategoryText]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };
  
  // Render featured items
  const renderFeaturedItems = () => {
    if (featuredItems.length === 0) return null;
    
    return (
      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>{i18n.t('featuredItems')}</Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.featuredItemsContainer}
        >
          {featuredItems.map(item => (
            <TouchableOpacity 
              key={item.id}
              style={styles.featuredItem}
              onPress={() => handlePurchase(item)}
            >
              <View style={styles.featuredImageContainer}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.featuredImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons 
                      name={
                        item.category === 'catering' ? 'restaurant' :
                        item.category === 'fitness' ? 'barbell' :
                        item.category === 'supplements' ? 'fitness' : 'pricetag'
                      } 
                      size={40} 
                      color="#ddd" 
                    />
                  </View>
                )}
                {item.discountPrice && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {Math.round((1 - item.discountPrice / item.price) * 100)}%
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.featuredItemName} numberOfLines={1}>{item.name}</Text>
              
              <View style={styles.featuredPriceContainer}>
                {item.discountPrice ? (
                  <>
                    <Text style={styles.originalPrice}>Rp {item.price}</Text>
                    <Text style={styles.discountPrice}>Rp {item.discountPrice}</Text>
                  </>
                ) : (
                  <Text style={styles.price}>Rp {item.price}</Text>
                )}
              </View>
              
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {item.category === 'catering' ? i18n.t('catering') :
                   item.category === 'fitness' ? i18n.t('fitness') :
                   item.category === 'supplements' ? i18n.t('supplements') : i18n.t('promos')}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  // Render store item
  const renderStoreItem = ({ item }: { item: StoreItem }) => {
    return (
      <TouchableOpacity 
        style={styles.storeItem}
        onPress={() => handlePurchase(item)}
      >
        <View style={styles.storeItemImageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.storeItemImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons 
                name={
                  item.category === 'catering' ? 'restaurant' :
                  item.category === 'fitness' ? 'barbell' :
                  item.category === 'supplements' ? 'fitness' : 'pricetag'
                } 
                size={30} 
                color="#ddd" 
              />
            </View>
          )}
          {item.discountPrice && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {Math.round((1 - item.discountPrice / item.price) * 100)}%
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.storeItemContent}>
          <View style={styles.storeItemHeader}>
            <Text style={styles.storeItemName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {item.category === 'catering' ? i18n.t('catering') :
                 item.category === 'fitness' ? i18n.t('fitness') :
                 item.category === 'supplements' ? i18n.t('supplements') : i18n.t('promos')}
              </Text>
            </View>
          </View>
          
          <Text style={styles.storeItemDescription} numberOfLines={2}>{item.description}</Text>
          
          <View style={styles.storeItemFooter}>
            <View style={styles.priceContainer}>
              {item.discountPrice ? (
                <>
                  <Text style={styles.originalPrice}>Rp {item.price}</Text>
                  <Text style={styles.discountPrice}>Rp {item.discountPrice}</Text>
                </>
              ) : (
                <Text style={styles.price}>Rp {item.price}</Text>
              )}
            </View>
            
            <View style={styles.buyButton}>
              <Text style={styles.buyButtonText}>{i18n.t('buy')}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render premium modal
  const renderPremiumModal = () => {
    return (
      <Modal
        visible={showPremiumModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.premiumModalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowPremiumModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            
            <MaterialCommunityIcons name="crown" size={60} color="#FFD700" style={styles.crownIcon} />
            
            <Text style={styles.premiumModalTitle}>{i18n.t('activatePremium')}</Text>
            <Text style={styles.premiumModalDescription}>{i18n.t('premiumBenefits')}</Text>
            
            <View style={styles.premiumCodeContainer}>
              <TextInput
                style={styles.premiumCodeInput}
                value={premiumCode}
                onChangeText={setPremiumCode}
                placeholder={i18n.t('enterPremiumCodePlaceholder')}
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
              
              <TouchableOpacity
                style={styles.activateButton}
                onPress={handleActivatePremium}
                disabled={activatingPremium}
              >
                {activatingPremium ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.activateButtonText}>{i18n.t('activate')}</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.noPremiumCodeText}>{i18n.t('noPremiumCode')}</Text>
            
            <TouchableOpacity
              style={styles.buyPremiumButton}
              onPress={buyPremiumCode}
            >
              <Text style={styles.buyPremiumButtonText}>{i18n.t('buyPremiumCode')}</Text>
              <Text style={styles.premiumPrice}>Rp 40.000</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>{i18n.t('loadingStore')}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('store')}</Text>
        {!isPremium && (
          <TouchableOpacity
            style={styles.premiumButton}
            onPress={() => setShowPremiumModal(true)}
          >
            <MaterialCommunityIcons name="crown" size={20} color="#FFD700" />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.koalaContainer}>
          <KoalaCharacter expression={koalaExpression} message={koalaMessage} />
        </View>
        
        {!isPremium && (
          <TouchableOpacity 
            style={styles.premiumBanner}
            onPress={() => setShowPremiumModal(true)}
          >
            <View style={styles.premiumBannerContent}>
              <MaterialCommunityIcons name="crown" size={30} color="#FFD700" />
              <View style={styles.premiumBannerTextContainer}>
                <Text style={styles.premiumBannerTitle}>{i18n.t('upgradeToPremium')}</Text>
                <Text style={styles.premiumBannerDescription}>{i18n.t('removeAdsAndMore')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        
        {renderCategorySelector()}
        
        {renderFeaturedItems()}
        
        <View style={styles.storeItemsSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? i18n.t('allItems') : 
             selectedCategory === 'catering' ? i18n.t('cateringItems') :
             selectedCategory === 'fitness' ? i18n.t('fitnessItems') :
             selectedCategory === 'supplements' ? i18n.t('supplementItems') : i18n.t('promoItems')}
          </Text>
          
          {filteredItems.length > 0 ? (
            <FlatList
              data={filteredItems}
              renderItem={renderStoreItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>{i18n.t('noItemsInCategory')}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.whatsappSection}>
          <Text style={styles.whatsappTitle}>{i18n.t('needHelp')}</Text>
          <Text style={styles.whatsappDescription}>{i18n.t('contactViaWhatsapp')}</Text>
          
          <TouchableOpacity 
            style={styles.whatsappButton}
            onPress={() => {
              const whatsappUrl = `https://wa.me/081260421586`;
              Linking.openURL(whatsappUrl);
            }}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#fff" />
            <Text style={styles.whatsappButtonText}>{i18n.t('contactUs')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {renderPremiumModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  premiumButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  koalaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#673AB7',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumBannerTextContainer: {
    marginLeft: 10,
  },
  premiumBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumBannerDescription: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  selectedCategory: {
    backgroundColor: '#FF5722',
  },
  categoryText: {
    fontSize: 14,
    color: '#FF5722',
    marginLeft: 5,
  },
  selectedCategoryText: {
    color: '#fff',
  },
  featuredSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 15,
    marginBottom: 15,
  },
  featuredItemsContainer: {
    paddingHorizontal: 15,
  },
  featuredItem: {
    width: 160,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  featuredImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  featuredItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    padding: 10,
  },
  featuredPriceContainer: {
    padding: 10,
    paddingTop: 0,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#fff',
  },
  storeItemsSection: {
    marginBottom: 20,
  },
  storeItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  storeItemImageContainer: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  storeItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  storeItemContent: {
    flex: 1,
    padding: 10,
  },
  storeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  storeItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  storeItemDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  storeItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flex: 1,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  buyButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  whatsappSection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  whatsappTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  whatsappDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  premiumModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  crownIcon: {
    marginBottom: 15,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  premiumModalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  premiumCodeContainer: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 20,
  },
  premiumCodeInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  activateButton: {
    backgroundColor: '#673AB7',
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activateButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 20,
  },
  noPremiumCodeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  buyPremiumButton: {
    width: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buyPremiumButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  premiumPrice: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
});

export default StoreScreen;