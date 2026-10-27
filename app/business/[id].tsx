import React, { useEffect, useMemo, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, ActivityIndicator, 
  TouchableOpacity, Platform, Dimensions, Linking, Alert, Share,
  Animated, Pressable, TextInput, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Colors from '../../constants/Colors';
import { addBusinessReview, getBusinessDetail, getBusinessReviews, updateBusinessReview } from '../../api/business';
// ✅ IMPORTUJEMY FUNKCJĘ TWORZENIA WIZYTY
import { createAppointment } from '../../api/appointments'; 
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useLocale } from '../../contexts/LocaleContext';
import BookingModal from '../../components/booking/BookingModal';
import OpeningHoursCard from '../../components/business/OpeningHoursCard';
import { Business, Review, Service, ServiceOption } from '../../types/api';
import { formatMoney, formatServicePrice, getServicePrice, isIndividuallyPriced } from '../../utils/currency';
import { localizedDescription, localizedName } from '../../utils/localized';
import { notify } from '../../utils/notify';
import { getFollowing, toggleFollowing } from '../../api/following';
import { buildServiceGroups, filterServiceGroups } from '../../utils/serviceGroups';

type CartItem = { service: Service; option?: ServiceOption };

const cartItemKey = (item: CartItem) =>
  `${item.service.id}:${item.option?.id || ''}`;

const activeServiceOptions = (service: Service) =>
  (service.options || []).filter((item) => item.is_active !== false);

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web' && width > 768;

// ✨ Animowane Serduszko (Ulubione)
function AnimatedHeart({ isFavorite, onPress }: { isFavorite: boolean; onPress: () => void }) {
  const scale = useState(new Animated.Value(1))[0];
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Pressable onPress={handlePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={26} color={isFavorite ? "#EF4444" : Colors.light.text} />
      </Animated.View>
    </Pressable>
  );
}

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const { currency, language, t } = useLocale();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [following, setFollowing] = useState(false);
  const [changingFollowing, setChangingFollowing] = useState(false);
  
  // Booking State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartServiceIds = useMemo(() => cart.map((item) => String(item.service.id)), [cart]);
  const cartOptionIds = useMemo(
    () => cart.map((item) => item.option?.id || null),
    [cart],
  );
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [optionPickerService, setOptionPickerService] = useState<Service | null>(null);
  const [serviceQuery, setServiceQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  // Owners/staff manage the salon — everyone else (customers, platform admin, guests) can book.
  const canBook = user?.role !== 'business_owner' && user?.role !== 'staff';

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const data = await getBusinessDetail(String(id));
        setBusiness(data);
        setReviews(await getBusinessReviews(data.slug));
        if (isLoggedIn && user?.role === 'customer') {
          const followed = await getFollowing();
          setFollowing(followed.some((item) => String(item.id) === String(data.id)));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadBusiness();
  }, [id, isLoggedIn, user?.role]);

  const handleFollowing = async () => {
    if (!business) return;
    if (!isLoggedIn) {
      router.push('/(auth)/login');
      return;
    }
    try {
      setChangingFollowing(true);
      const result = await toggleFollowing(String(business.id));
      setFollowing(result.is_following);
      notify(
        result.is_following ? t('business.followOn') : t('business.followOff'),
        result.is_following ? t('business.followOnHint') : t('business.followOffHint'),
      );
    } catch {
      notify(t('common.error'), t('business.followError'));
    } finally {
      setChangingFollowing(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!business) return;
    try {
      setSubmittingReview(true);
      if (editingReview) {
        const review = await updateBusinessReview(business.slug, editingReview.id, {
          rating: reviewRating,
          comment: reviewComment.trim(),
        });
        setReviews((current) => current.map((item) => item.id === review.id ? review : item));
        setEditingReview(null);
        notify('Zapisano', 'Twoja opinia została zaktualizowana.');
      } else {
        const review = await addBusinessReview(business.slug, {
          rating: reviewRating,
          comment: reviewComment.trim(),
        });
        setReviews((current) => [review, ...current]);
        setBusiness({ ...business, can_review: false });
        notify('Dziękujemy', 'Twoja opinia została dodana.');
      }
      setReviewComment('');
    } catch (error: any) {
      notify(
        'Nie udało się zapisać opinii',
        error?.response?.data?.error?.message || error?.response?.data?.detail || error?.message
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleCartItem = (service: Service, option?: ServiceOption) => {
    const next: CartItem = { service, option };
    const key = cartItemKey(next);
    setCart((prev) => {
      if (prev.some((item) => cartItemKey(item) === key)) {
        return prev.filter((item) => cartItemKey(item) !== key);
      }
      return [...prev, next];
    });
  };

  const handleBook = (service: Service) => {
    if (!canBook) {
      notify('Konto firmowe', 'Zaloguj się na konto klienta, żeby zarezerwować wizytę.');
      return;
    }
    if (!isLoggedIn) {
      Alert.alert('Wymagane logowanie', 'Musisz być zalogowany, aby zarezerwować termin.', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Zaloguj się', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }
    const options = activeServiceOptions(service);
    if (options.length) {
      const already = cart.filter((item) => String(item.service.id) === String(service.id));
      if (already.length === options.length) {
        setCart((prev) => prev.filter((item) => String(item.service.id) !== String(service.id)));
        return;
      }
      setOptionPickerService(service);
      return;
    }
    toggleCartItem(service);
  };

  const openCartBooking = () => {
    if (!cart.length) return;
    setSelectedService(cart[0].service);
    setShowBookingModal(true);
  };

  // ✅ PODPIĘTE PRAWDZIWE API REZERWACJI
  const handleBookingConfirm = async (date: string, time: string, staffId?: string) => {
    if (!business || !selectedService) return;

    try {
      const businessSlug = business.slug || String(business.id);
      
      // Wysyłamy prośbę o rezerwację do Django
      await createAppointment(businessSlug, {
        service_ids: cart.map((item) => String(item.service.id)),
        service_option_ids: cartOptionIds,
        date: date,
        start_time: time,
        staff_id: staffId,
      });

      // Zamykamy modal przed wyskoczeniem alertu, żeby się nie zablokował
      setShowBookingModal(false);
      setCart([]);

      // Dodajemy małe opóźnienie na Alert, by Modal zdążył zniknąć (głównie dla iOS)
      setTimeout(() => {
        Alert.alert(
          'Rezerwacja wysłana',
          `Wizyta (${cart.length || 1} usług) została zapisana na ${date} o ${time}. Czeka na zatwierdzenie.`
        );
      }, 300);

    } catch (error: any) {
      setShowBookingModal(false);
      const code = error?.response?.data?.error?.code || error?.code;
      const message = error?.message || 'Nie udało się zarezerwować wizyty. Spróbuj ponownie.';
      setTimeout(() => {
        if (code === 'EMAIL_NOT_VERIFIED') {
          Alert.alert(
            'Potwierdź e-mail',
            'Żeby umówić wizytę, potwierdź adres e-mail (link w wiadomości).',
            [
              { text: 'Anuluj', style: 'cancel' },
              {
                text: 'Potwierdź teraz',
                onPress: () =>
                  router.push({
                    pathname: '/(auth)/verify-email',
                    params: { email: user?.email || '' },
                  } as any),
              },
            ],
          );
          return;
        }
        Alert.alert('Błąd', message);
      }, 300);
    }
  };

  const handleShare = async () => {
    if (!business) return;
    try {
      await Share.share({
        message: `Sprawdź ${business.name} na Sessly! Najlepsze usługi w okolicy.`,
        title: `${business.name} - Sessly`
      });
    } catch (error) {
      console.error(error);
    }
  };

  const services = ((business as any)?.services || []) as Service[];
  const serviceGroups = useMemo(() => {
    const categories = Array.from(
      new Map(
        services
          .map((service) => service.category)
          .filter(Boolean)
          .map((category) => [String(category!.id), category!]),
      ).values(),
    );
    return filterServiceGroups(
      buildServiceGroups(services, categories, t('booking.uncategorized')),
      serviceQuery,
    );
  }, [services, serviceQuery, t]);

  const toggleCategory = (id: string) => {
    setCollapsedCategories((current) => ({ ...current, [id]: !current[id] }));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.center}>
        <Ionicons name="storefront-outline" size={64} color="#CBD5E1" />
        <Text style={styles.errorText}>Nie znaleziono biznesu.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => goBackToApp(router, '/(tabs)')}>
          <Text style={styles.backBtnText}>Powrót do strony głównej</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hours = (business as any).opening_hours || [];
  const address = `${business.address_line1 || ''}, ${(business as any).city || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '');
  const businessId = String(business.id);
  const favorite = isFavorite(businessId);

  return (
    <View style={styles.container}>
      {/* Nawigacja Górna */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => goBackToApp(router, '/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.topNavRight}>
          <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <View style={styles.navBtn}>
            <AnimatedHeart 
              isFavorite={favorite} 
              onPress={() => toggleFavorite(business as any)} 
            />
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, isWeb && styles.webScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        {/* Zdjęcie w tle */}
        <View style={[styles.coverImage, { backgroundColor: business.brand_color || '#B8A3E0' }]}>
          {business.cover_image || business.images?.[0]?.url || business.logo_url ? (
            <Image
              source={{ uri: business.cover_image || business.images?.[0]?.url || business.logo_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="storefront" size={80} color="rgba(255,255,255,0.4)" />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.imageGradient}
          />
        </View>

        {/* Główne informacje */}
        <View style={[styles.mainInfoCard, isWeb && styles.webCard]}>
          <View style={styles.titleRow}>
            {business.logo_url ? (
              <Image source={{ uri: business.logo_url }} style={styles.logoAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.logoAvatar, styles.logoAvatarFallback, { backgroundColor: business.brand_color || '#EDE9FE' }]}>
                <Text style={styles.logoAvatarLetter}>{(business.name || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.title}>{business.name}</Text>
          </View>
          {address ? (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color={Colors.light.accent} />
              <Text style={styles.infoText}>{address}</Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            {canBook ? (
              <TouchableOpacity
                style={[styles.actionBtn, following && { backgroundColor: Colors.light.accent }]}
                onPress={handleFollowing}
                disabled={changingFollowing}
              >
                {changingFollowing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name={following ? 'notifications' : 'notifications-outline'} size={18} color="#fff" />}
                <Text style={styles.actionBtnText} numberOfLines={1}>{following ? t('business.following') : t('business.follow')}</Text>
              </TouchableOpacity>
            ) : null}
            {business.phone_number && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${business.phone_number}`)}>
                <Ionicons name="call-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText} numberOfLines={1}>{t('business.call')}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#F5F3FF' }]} 
              onPress={() => Linking.openURL(`http://maps.apple.com/?q=${encodeURIComponent(address || business.name)}`)}
            >
              <Ionicons name="map-outline" size={18} color={Colors.light.accent} />
              <Text style={[styles.actionBtnText, { color: Colors.light.accent }]} numberOfLines={1}>{t('business.directions')}</Text>
            </TouchableOpacity>

            {(business as any).website_url && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#F5F3FF' }]} 
                onPress={() => Linking.openURL((business as any).website_url)}
              >
                <Ionicons name="globe-outline" size={18} color={Colors.light.accent} />
                <Text style={[styles.actionBtnText, { color: Colors.light.accent }]} numberOfLines={1}>WWW</Text>
              </TouchableOpacity>
            )}
          </View>

          {localizedDescription(business, language) ? (
            <View style={styles.descSection}>
              <Text style={styles.sectionTitle}>{t('business.about')}</Text>
              <Text style={styles.descText}>{localizedDescription(business, language)}</Text>
            </View>
          ) : null}

        </View>

        {business.images && business.images.length > 1 ? (
          <View style={[styles.gallerySection, isWeb && styles.webCard]}>
            <Text style={styles.sectionTitle}>{t('business.gallery')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
              {business.images.map((image) => (
                <Image key={image.id} source={{ uri: image.url }} style={styles.galleryImage} contentFit="cover" />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {hours.length > 0 && (
          <View style={[styles.hoursSection, isWeb && styles.webCard]}>
            <OpeningHoursCard hours={hours} />
          </View>
        )}

        {/* Sekcja Usług */}
        <View style={[styles.servicesSection, isWeb && styles.webCard]}>
          <Text style={styles.sectionTitle}>{t('booking.selectService')}</Text>

          {services.length > 0 ? (
            <View style={styles.serviceSearchWrap}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.serviceSearchInput}
                value={serviceQuery}
                onChangeText={setServiceQuery}
                placeholder={t('booking.searchServices')}
                placeholderTextColor="#94A3B8"
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {serviceQuery ? (
                <TouchableOpacity onPress={() => setServiceQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {services.length === 0 ? (
            <View style={styles.emptyServices}>
              <Ionicons name="cut-outline" size={40} color="#CBD5E1" />
              <Text style={styles.descText}>{t('booking.noServices')}</Text>
            </View>
          ) : serviceGroups.length === 0 ? (
            <View style={styles.emptyServices}>
              <Ionicons name="search-outline" size={40} color="#CBD5E1" />
              <Text style={styles.descText}>{t('booking.noSearchResults')}</Text>
            </View>
          ) : (
            serviceGroups.map((group) => {
              const collapsed = Boolean(collapsedCategories[group.id]);
              return (
                <View key={group.id} style={styles.serviceCategoryBlock}>
                  <View style={[styles.serviceCategoryAccent, { backgroundColor: group.color }]} />
                  <TouchableOpacity
                    style={styles.serviceCategoryHeader}
                    onPress={() => toggleCategory(group.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.serviceCategoryDot, { backgroundColor: group.color }]} />
                    <Text style={styles.serviceCategoryTitle}>{group.name}</Text>
                    <View style={styles.serviceCategoryCountPill}>
                      <Text style={styles.serviceCategoryCount}>{group.services.length}</Text>
                    </View>
                    <Ionicons
                      name={collapsed ? 'chevron-down' : 'chevron-up'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>

                  {!collapsed
                    ? group.services.map((service: Service) => {
                        const options = activeServiceOptions(service);
                        const inCart = cart.some((item) => String(item.service.id) === String(service.id));
                        const promotionActive = Boolean(
                          service.promotional_price_amount
                          && (!service.promotion_valid_until || new Date(service.promotion_valid_until) >= new Date())
                        );
                        return (
                          <TouchableOpacity
                            key={service.id}
                            style={[styles.serviceItem, inCart && styles.serviceItemActive]}
                            onPress={() => handleBook(service)}
                            activeOpacity={0.7}
                            disabled={!canBook}
                          >
                            {service.image_url ? (
                              <Image
                                source={{ uri: service.image_url }}
                                style={styles.serviceThumb}
                                contentFit="cover"
                              />
                            ) : null}
                            <View style={styles.serviceDetails}>
                              <Text style={styles.serviceName}>{localizedName(service, language)}</Text>
                              {localizedDescription(service, language) ? (
                                <Text style={styles.serviceDesc} numberOfLines={2}>
                                  {localizedDescription(service, language)}
                                </Text>
                              ) : null}
                              {options.length ? (
                                <Text style={styles.serviceDesc} numberOfLines={1}>
                                  {options.map((item) => item.localized_name || item.name).join(' · ')}
                                </Text>
                              ) : null}
                              <View style={styles.serviceMeta}>
                                <Text style={styles.servicePrice}>
                                  {formatServicePrice(service, currency, {
                                    individuallyPricedLabel: t('booking.individuallyPriced'),
                                  })}
                                  {service.price_is_indicative && !isIndividuallyPriced(service) ? '*' : ''}
                                </Text>
                                {promotionActive && !options.length && !isIndividuallyPriced(service) ? (
                                  <Text style={styles.regularPrice}>
                                    {formatMoney(getServicePrice(service, currency, { preferPromo: false }), currency)}
                                  </Text>
                                ) : null}
                                <View style={styles.dot} />
                                <Text style={styles.serviceDuration}>
                                  {(service as any).duration_minutes || 60} min
                                </Text>
                              </View>
                              {isIndividuallyPriced(service) ? (
                                <Text style={styles.indicativeNote}>{t('booking.individuallyPricedNote')}</Text>
                              ) : service.price_is_indicative ? (
                                <Text style={styles.indicativeNote}>{t('booking.indicativePriceNote')}</Text>
                              ) : null}
                            </View>

                            {canBook ? (
                              <View style={[styles.bookBtn, inCart && styles.bookBtnActive]}>
                                <Text style={[styles.bookBtnText, inCart && { color: '#fff' }]}>
                                  {inCart
                                    ? t('booking.inCart')
                                    : options.length
                                      ? t('booking.chooseOption')
                                      : t('booking.add')}
                                </Text>
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })
                    : null}
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.reviewsSection, isWeb && styles.webCard]}>
          <Text style={styles.sectionTitle}>{t('business.reviewsCount', undefined, { count: reviews.length })}</Text>
          {(business.can_review && isLoggedIn) || editingReview ? (
            <View style={styles.reviewForm}>
              <Text style={styles.reviewFormTitle}>{editingReview ? t('business.editReview') : t('business.addReview')}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <TouchableOpacity key={rating} onPress={() => setReviewRating(rating)}>
                    <Ionicons name={rating <= reviewRating ? 'star' : 'star-outline'} size={28} color="#F59E0B" />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder={t('business.reviewPlaceholder')}
                multiline
              />
              <TouchableOpacity style={styles.reviewButton} onPress={handleReviewSubmit} disabled={submittingReview}>
                {submittingReview ? <ActivityIndicator color="#fff" /> : <Text style={styles.reviewButtonText}>{editingReview ? t('business.saveReview') : t('business.addReview')}</Text>}
              </TouchableOpacity>
              {editingReview ? (
                <TouchableOpacity onPress={() => { setEditingReview(null); setReviewComment(''); }}>
                  <Text style={styles.cancelEdit}>{t('business.cancelEdit')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          {reviews.length ? reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{review.customer_first_name || review.customer_username}</Text>
                <Text style={styles.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
              </View>
              {(review.localized_comment || review.comment) ? (
                <Text style={styles.reviewText}>{review.localized_comment || review.comment}</Text>
              ) : null}
              {review.is_own ? (
                <TouchableOpacity
                  style={styles.editReviewBtn}
                  onPress={() => {
                    setEditingReview(review);
                    setReviewRating(review.rating);
                    setReviewComment(review.comment || '');
                  }}
                >
                  <Text style={styles.editReviewText}>{t('business.editReviewAction')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )) : <Text style={styles.descText}>{t('business.noReviews')}</Text>}
        </View>
      </ScrollView>

      {canBook && cart.length > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={openCartBooking}>
          <Text style={styles.cartBarText}>
            {t('business.bookServices', undefined, {
              count: cart.length,
              label: cart.length === 1 ? t('business.serviceSingular') : t('business.servicePlural'),
              minutes: cart.reduce(
                (sum, item) =>
                  sum
                  + (item.option?.effective_duration_minutes
                    || item.option?.duration_minutes
                    || item.service.duration_minutes
                    || 0),
                0,
              ),
            })}
          </Text>
        </TouchableOpacity>
      )}

      {canBook && showBookingModal && selectedService && (
        <BookingModal
          visible={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          service={selectedService as any}
          serviceIds={cartServiceIds}
          serviceOptionIds={cartOptionIds}
          business={business as any}
          onConfirm={handleBookingConfirm}
        />
      )}

      {optionPickerService ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setOptionPickerService(null)}
        >
          <View style={styles.optionOverlay}>
            <View style={styles.optionCard}>
              <Text style={styles.optionTitle}>{t('booking.chooseOption')}</Text>
              <Text style={styles.optionSubtitle}>{localizedName(optionPickerService, language)}</Text>
              {activeServiceOptions(optionPickerService).map((option) => {
                const selected = cart.some(
                  (item) =>
                    String(item.service.id) === String(optionPickerService.id)
                    && String(item.option?.id) === String(option.id),
                );
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.optionRow, selected && styles.optionRowActive]}
                    onPress={() => {
                      toggleCartItem(optionPickerService, option);
                      setOptionPickerService(null);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionName}>{option.localized_name || option.name}</Text>
                      <Text style={styles.optionMeta}>
                        {isIndividuallyPriced(optionPickerService)
                          || (getServicePrice(option, currency) == null
                            && optionPickerService.price_is_indicative)
                          ? t('booking.individuallyPriced')
                          : formatMoney(getServicePrice(option, currency), currency)}
                        {' · '}
                        {option.effective_duration_minutes
                          || option.duration_minutes
                          || optionPickerService.duration_minutes}
                        {' min'}
                      </Text>
                    </View>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={22}
                      color={Colors.light.accent}
                    />
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.optionCancel} onPress={() => setOptionPickerService(null)}>
                <Text style={styles.optionCancelText}>{t('common.back')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topNav: {
    flexDirection: 'row', justifyContent: 'space-between',
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 16, right: 16, zIndex: 10
  },
  topNavRight: { flexDirection: 'row', gap: 10 },
  navBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center', ...Colors.shadows.sm
  },
  scrollContent: { paddingBottom: 80 },
  webScrollContent: { maxWidth: 800, alignSelf: 'center', width: '100%' },
  coverImage: { height: 280, backgroundColor: '#B8A3E0', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  mainInfoCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -32, padding: 24, ...Colors.shadows.sm
  },
  webCard: { borderRadius: 24, marginTop: 24, marginHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  logoAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F5F3FF' },
  logoAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  logoAvatarLetter: { color: '#fff', fontSize: 22, fontWeight: '900' },
  title: { flex: 1, fontSize: 28, fontWeight: '900', color: Colors.light.text },
  serviceThumb: {
    width: 64, height: 64, borderRadius: 14, marginRight: 12, backgroundColor: '#F5F3FF',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 6 },
  infoText: { fontSize: 15, color: Colors.light.textSecondary, flex: 1, fontWeight: '500' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionBtn: {
    width: '48%',
    minHeight: 52,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: Colors.light.accent,
    gap: 4,
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  descSection: { paddingTop: 24, borderTopWidth: 1, borderTopColor: Colors.light.border },
  promotionBox: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 16, padding: 16, backgroundColor: '#FAF8FF' },
  promotionContent: { flex: 1 },
  promotionTitle: { color: Colors.light.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  promotionText: { color: Colors.light.textSecondary, lineHeight: 20 },
  promotionDate: { color: Colors.light.accent, fontSize: 12, fontWeight: '700', marginTop: 6 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.light.text, marginBottom: 16 },
  descText: { fontSize: 15, lineHeight: 24, color: Colors.light.textSecondary },
  gallerySection: { backgroundColor: '#fff', marginTop: 12, paddingVertical: 24, ...Colors.shadows.sm },
  galleryRow: { gap: 12, paddingHorizontal: 24 },
  galleryImage: { width: 220, height: 150, borderRadius: 16, backgroundColor: '#EDE9FE' },
  hoursSection: { backgroundColor: '#fff', marginTop: 12, padding: 24, ...Colors.shadows.sm },
  servicesSection: { backgroundColor: '#fff', marginTop: 12, padding: 24, ...Colors.shadows.sm },
  serviceSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 16,
  },
  serviceSearchInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: '600',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  serviceCategoryBlock: {
    marginBottom: 18,
    marginTop: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  serviceCategoryAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, zIndex: 1 },
  serviceCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  serviceCategoryDot: { width: 12, height: 12, borderRadius: 6 },
  serviceCategoryTitle: {
    flex: 1, fontSize: 13, fontWeight: '800', color: '#0F172A',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  serviceCategoryCountPill: {
    minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 999,
    backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
  },
  serviceCategoryCount: { fontSize: 12, fontWeight: '800', color: '#475569' },
  emptyServices: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  serviceItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  serviceDetails: { flex: 1, paddingRight: 16 },
  serviceName: { fontSize: 17, fontWeight: '800', color: Colors.light.text, marginBottom: 6 },
  serviceDesc: { fontSize: 13, color: Colors.light.textSecondary, marginBottom: 10, lineHeight: 18 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center' },
  servicePrice: { fontSize: 15, fontWeight: '800', color: Colors.light.accent },
  regularPrice: { marginLeft: 7, fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginHorizontal: 8 },
  serviceDuration: { fontSize: 14, color: Colors.light.textSecondary, fontWeight: '500' },
  indicativeNote: {
    marginTop: 6, fontSize: 12, lineHeight: 16, color: '#64748B', fontWeight: '600', fontStyle: 'italic',
  },
  optionOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20,
  },
  optionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18 },
  optionTitle: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  optionSubtitle: { marginTop: 4, marginBottom: 14, color: '#64748B', fontWeight: '600' },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 14, backgroundColor: '#F8FAFC', marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  optionRowActive: { backgroundColor: '#F5F3FF', borderColor: Colors.light.accent },
  optionName: { fontSize: 15, fontWeight: '800', color: Colors.light.text },
  optionMeta: { marginTop: 3, fontSize: 13, color: '#64748B', fontWeight: '600' },
  optionCancel: { alignItems: 'center', paddingTop: 8 },
  optionCancelText: { color: '#64748B', fontWeight: '800' },
  bookBtn: {
    backgroundColor: '#F5F3FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20,
    borderWidth: 1, borderColor: '#EDE9FE'
  },
  bookBtnText: { color: Colors.light.accent, fontWeight: '800', fontSize: 14 },
  serviceItemActive: { backgroundColor: '#F5F3FF', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12 },
  bookBtnActive: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
  reviewsSection: { backgroundColor: '#fff', marginTop: 12, padding: 24, ...Colors.shadows.sm },
  reviewForm: { padding: 16, borderRadius: 16, backgroundColor: '#FAF8FF', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  reviewInput: { minHeight: 80, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#fff', padding: 12, textAlignVertical: 'top' },
  reviewButton: { marginTop: 12, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.accent },
  reviewButtonText: { color: '#fff', fontWeight: '800' },
  reviewFormTitle: { fontSize: 14, fontWeight: '800', color: Colors.light.text, marginBottom: 8 },
  cancelEdit: { textAlign: 'center', color: '#DC2626', fontWeight: '700', marginTop: 10 },
  editReviewBtn: { marginTop: 8, alignSelf: 'flex-start' },
  editReviewText: { color: Colors.light.accent, fontWeight: '800', fontSize: 13 },
  reviewItem: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reviewAuthor: { flex: 1, color: Colors.light.text, fontWeight: '800' },
  reviewStars: { color: '#F59E0B', fontSize: 16 },
  reviewText: { color: Colors.light.textSecondary, lineHeight: 21, marginTop: 8 },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: Colors.light.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cartBarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  backBtn: { marginTop: 20, backgroundColor: Colors.light.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  backBtnText: { color: '#fff', fontWeight: '700' },
  errorText: { fontSize: 18, color: Colors.light.textSecondary, marginTop: 16, fontWeight: '600' }
});