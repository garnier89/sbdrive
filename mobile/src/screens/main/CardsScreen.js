// Écran Cartes Virtuelles SBPAYGO Mobile
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { cardAPI } from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';
import CONFIG from '../../config';

const CARD_COLORS = [
  { id: 'orange', hex: '#f97316', name: 'Orange' },
  { id: 'red', hex: '#ef4444', name: 'Rouge' },
  { id: 'emerald', hex: '#10b981', name: 'Vert' },
  { id: 'purple', hex: '#8b5cf6', name: 'Violet' },
  { id: 'blue', hex: '#3b82f6', name: 'Bleu' },
  { id: 'slate', hex: '#475569', name: 'Gris' },
  { id: 'amber', hex: '#f59e0b', name: 'Ambre' },
  { id: 'teal', hex: '#14b8a6', name: 'Turquoise' },
];

export default function CardsScreen({ navigation }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(null);
  const [newCard, setNewCard] = useState({
    name: '',
    color: 'orange',
    currency: 'EUR',
  });
  const [creating, setCreating] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState('');

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await cardAPI.getCards();
      setCards(response.data);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCards();
  };

  const handleCreateCard = async () => {
    if (!newCard.name.trim()) {
      Alert.alert('Erreur', 'Veuillez donner un nom à votre carte');
      return;
    }

    setCreating(true);
    try {
      await cardAPI.createCard({
        card_name: newCard.name,
        card_color: newCard.color,
        currency: newCard.currency,
      });
      
      Alert.alert('Succès', 'Votre carte virtuelle a été créée!');
      setShowCreateModal(false);
      setNewCard({ name: '', color: 'orange', currency: 'EUR' });
      fetchCards();
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de créer la carte');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleCard = async (card) => {
    try {
      await cardAPI.toggleCard(card.id);
      fetchCards();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier la carte');
    }
  };

  const handleShowDetails = (card) => {
    setShowCardDetails(card);
    setShowPinEntry(true);
    setPin('');
  };

  const verifyPinAndShowDetails = async () => {
    if (pin.length !== 4) {
      Alert.alert('Erreur', 'Veuillez entrer un PIN à 4 chiffres');
      return;
    }

    try {
      const response = await cardAPI.verifyPin(showCardDetails.id, pin);
      if (response.data.valid) {
        setShowPinEntry(false);
        // Afficher les détails de la carte
      } else {
        Alert.alert('Erreur', 'PIN incorrect');
      }
    } catch (error) {
      Alert.alert('Erreur', 'PIN incorrect');
    }
  };

  const formatCardNumber = (number, hidden = true) => {
    if (!number) return '•••• •••• •••• ••••';
    if (hidden) {
      return `•••• •••• •••• ${number.slice(-4)}`;
    }
    return number.replace(/(.{4})/g, '$1 ').trim();
  };

  const getCardColor = (colorId) => {
    return CARD_COLORS.find(c => c.id === colorId)?.hex || COLORS.primary;
  };

  const renderCard = (card) => (
    <TouchableOpacity 
      key={card.id}
      style={styles.cardWrapper}
      onPress={() => handleShowDetails(card)}
      activeOpacity={0.9}
    >
      <View style={[styles.virtualCard, { backgroundColor: getCardColor(card.card_color || 'orange') }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardChip}>
            <View style={styles.chipLines}>
              <View style={styles.chipLine} />
              <View style={styles.chipLine} />
              <View style={styles.chipLine} />
            </View>
          </View>
          <View style={styles.cardBrand}>
            <Text style={styles.cardBrandText}>SBPAYGO</Text>
            <Text style={styles.cardTypeText}>VIRTUAL</Text>
          </View>
        </View>

        {/* Card Number */}
        <Text style={styles.cardNumber}>
          {formatCardNumber(card.card_number)}
        </Text>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.cardHolderInfo}>
            <Text style={styles.cardLabel}>TITULAIRE</Text>
            <Text style={styles.cardHolderName} numberOfLines={1}>
              {card.card_name || 'MA CARTE'}
            </Text>
          </View>
          <View style={styles.cardExpiry}>
            <Text style={styles.cardLabel}>EXPIRE</Text>
            <Text style={styles.cardExpiryDate}>
              {card.expiry_date || '12/28'}
            </Text>
          </View>
          <Text style={styles.visaLogo}>VISA</Text>
        </View>

        {/* Status indicator */}
        {!card.is_active && (
          <View style={styles.inactiveOverlay}>
            <Text style={styles.inactiveText}>DÉSACTIVÉE</Text>
          </View>
        )}
      </View>

      {/* Card Actions */}
      <View style={styles.cardActions}>
        <View style={styles.cardBalance}>
          <Text style={styles.balanceLabel}>Solde</Text>
          <Text style={styles.balanceAmount}>
            {(card.balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {CONFIG.CURRENCY_SYMBOLS[card.currency]}
          </Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleToggleCard(card)}
          >
            <Icon 
              name={card.is_active ? 'pause' : 'play'} 
              size={18} 
              color={card.is_active ? COLORS.warning : COLORS.success} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="settings" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle carte</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Icon name="x" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Nom de la carte */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom de la carte</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Shopping, Voyages..."
              placeholderTextColor={COLORS.textTertiary}
              value={newCard.name}
              onChangeText={(text) => setNewCard({ ...newCard, name: text })}
            />
          </View>

          {/* Choix de couleur */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Couleur</Text>
            <View style={styles.colorGrid}>
              {CARD_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.id}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color.hex },
                    newCard.color === color.id && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewCard({ ...newCard, color: color.id })}
                >
                  {newCard.color === color.id && (
                    <Icon name="check" size={16} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Aperçu */}
          <View style={styles.previewContainer}>
            <Text style={styles.inputLabel}>Aperçu</Text>
            <View style={[styles.previewCard, { backgroundColor: getCardColor(newCard.color) }]}>
              <Text style={styles.previewCardName}>{newCard.name || 'MA CARTE'}</Text>
              <Text style={styles.previewCardNumber}>•••• •••• •••• ••••</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createButton, creating && styles.buttonDisabled]}
            onPress={handleCreateCard}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Icon name="plus" size={20} color={COLORS.white} />
                <Text style={styles.createButtonText}>Créer la carte</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mes Cartes</Text>
          <Text style={styles.headerSubtitle}>
            {cards.length} carte{cards.length > 1 ? 's' : ''} virtuelle{cards.length > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Cards List */}
        {cards.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Icon name="credit-card" size={48} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Aucune carte</Text>
            <Text style={styles.emptyText}>
              Créez votre première carte virtuelle pour effectuer des paiements en ligne
            </Text>
          </View>
        ) : (
          cards.map(renderCard)
        )}

        {/* Add Card Button */}
        <TouchableOpacity
          style={styles.addCardButton}
          onPress={() => setShowCreateModal(true)}
        >
          <View style={styles.addCardIcon}>
            <Icon name="plus" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.addCardText}>
            <Text style={styles.addCardTitle}>Nouvelle carte</Text>
            <Text style={styles.addCardSubtitle}>Créer une carte virtuelle</Text>
          </View>
          <Icon name="chevron-right" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </ScrollView>

      {renderCreateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONT_SIZES.h2,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  cardWrapper: {
    marginBottom: SPACING.xl,
  },
  virtualCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    aspectRatio: 1.586, // Standard card ratio
    ...SHADOWS.card,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
  },
  cardChip: {
    width: 44,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    padding: 4,
    justifyContent: 'center',
  },
  chipLines: {
    gap: 3,
  },
  chipLine: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 1,
  },
  cardBrand: {
    alignItems: 'flex-end',
  },
  cardBrandText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    opacity: 0.9,
  },
  cardTypeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    opacity: 0.7,
  },
  cardNumber: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: SPACING.xl,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardHolderInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  cardHolderName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  cardExpiry: {
    marginHorizontal: SPACING.lg,
  },
  cardExpiryDate: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  visaLogo: {
    fontSize: FONT_SIZES.h3,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    fontStyle: 'italic',
  },
  inactiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    letterSpacing: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: -SPACING.lg,
    marginHorizontal: SPACING.md,
    ...SHADOWS.sm,
  },
  cardBalance: {},
  balanceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  balanceAmount: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  addCardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  addCardSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inputGroup: {
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: COLORS.white,
    ...SHADOWS.md,
  },
  previewContainer: {
    marginBottom: SPACING.xl,
  },
  previewCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    aspectRatio: 2.5,
    justifyContent: 'space-between',
  },
  previewCardName: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  previewCardNumber: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    letterSpacing: 2,
    opacity: 0.8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
