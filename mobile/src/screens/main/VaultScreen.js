// Écran Coffre-Fort SBPAYGO Mobile
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { vaultAPI, walletAPI } from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';
import CONFIG from '../../config';

export default function VaultScreen({ navigation }) {
  const [vaultData, setVaultData] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'deposit' or 'withdraw'
  const [pin, setPin] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vaultRes, walletsRes] = await Promise.all([
        vaultAPI.getVault(),
        walletAPI.getWallets(),
      ]);
      setVaultData(vaultRes.data);
      setWallets(walletsRes.data);
    } catch (error) {
      console.error('Error fetching vault data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (pin.length !== 4) {
      Alert.alert('Erreur', 'Veuillez entrer un PIN à 4 chiffres');
      return;
    }

    setProcessing(true);
    try {
      const response = await vaultAPI.verifyPin(pin);
      if (response.data.valid) {
        setIsUnlocked(true);
        setShowPinModal(false);
        setPin('');
      } else {
        Alert.alert('Erreur', 'PIN incorrect');
      }
    } catch (error) {
      Alert.alert('Erreur', 'PIN incorrect');
    } finally {
      setProcessing(false);
    }
  };

  const handleAction = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    setProcessing(true);
    try {
      if (actionType === 'deposit') {
        await vaultAPI.deposit({ amount: amountNum, currency: selectedCurrency, pin });
        Alert.alert('Succès', `${amountNum} ${CONFIG.CURRENCY_SYMBOLS[selectedCurrency]} déposé dans le coffre-fort`);
      } else {
        await vaultAPI.withdraw({ amount: amountNum, currency: selectedCurrency, pin });
        Alert.alert('Succès', `${amountNum} ${CONFIG.CURRENCY_SYMBOLS[selectedCurrency]} retiré du coffre-fort`);
      }
      setShowActionModal(false);
      setAmount('');
      setPin('');
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Opération impossible');
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (type) => {
    setActionType(type);
    setShowActionModal(true);
  };

  const getTotalVaultBalance = () => {
    if (!vaultData?.balances) return 0;
    // Convertir tout en EUR pour le total
    const rates = { EUR: 1, USD: 0.93, XOF: 0.0015, GBP: 1.16 };
    return Object.entries(vaultData.balances).reduce((total, [currency, balance]) => {
      return total + (balance * (rates[currency] || 1));
    }, 0);
  };

  const renderPinModal = () => (
    <Modal
      visible={showPinModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPinModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.pinModalContent}>
          <View style={styles.lockIconContainer}>
            <Icon name="lock" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.pinModalTitle}>Déverrouiller le coffre</Text>
          <Text style={styles.pinModalSubtitle}>Entrez votre PIN à 4 chiffres</Text>
          
          <View style={styles.pinInputContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={[styles.pinDot, pin.length > index && styles.pinDotFilled]} />
            ))}
          </View>
          
          <TextInput
            style={styles.hiddenInput}
            value={pin}
            onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
          />
          
          <View style={styles.pinModalButtons}>
            <TouchableOpacity
              style={styles.pinCancelButton}
              onPress={() => { setShowPinModal(false); setPin(''); }}
            >
              <Text style={styles.pinCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pinConfirmButton, processing && styles.buttonDisabled]}
              onPress={handleUnlock}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.pinConfirmText}>Confirmer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderActionModal = () => (
    <Modal
      visible={showActionModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowActionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.actionModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {actionType === 'deposit' ? 'Déposer' : 'Retirer'}
            </Text>
            <TouchableOpacity onPress={() => { setShowActionModal(false); setAmount(''); setPin(''); }}>
              <Icon name="x" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Currency Selection */}
          <View style={styles.currencySelector}>
            {wallets.map((wallet) => (
              <TouchableOpacity
                key={wallet.id}
                style={[styles.currencyChip, selectedCurrency === wallet.currency && styles.currencyChipActive]}
                onPress={() => setSelectedCurrency(wallet.currency)}
              >
                <Text style={[styles.currencyText, selectedCurrency === wallet.currency && styles.currencyTextActive]}>
                  {CONFIG.CURRENCY_SYMBOLS[wallet.currency]} {wallet.currency}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Available Balance */}
          <View style={styles.availableBalance}>
            <Text style={styles.availableLabel}>
              {actionType === 'deposit' ? 'Solde wallet disponible' : 'Solde coffre disponible'}
            </Text>
            <Text style={styles.availableAmount}>
              {actionType === 'deposit' 
                ? (wallets.find(w => w.currency === selectedCurrency)?.balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })
                : (vaultData?.balances?.[selectedCurrency] || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })
              } {CONFIG.CURRENCY_SYMBOLS[selectedCurrency]}
            </Text>
          </View>

          {/* Amount Input */}
          <View style={styles.amountInputWrapper}>
            <Text style={styles.amountLabel}>Montant</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>{CONFIG.CURRENCY_SYMBOLS[selectedCurrency]}</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textTertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* PIN Input */}
          <View style={styles.pinInputWrapper}>
            <Text style={styles.amountLabel}>PIN de sécurité</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="****"
              placeholderTextColor={COLORS.textTertiary}
              value={pin}
              onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.actionButton, processing && styles.buttonDisabled]}
            onPress={handleAction}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Icon name={actionType === 'deposit' ? 'download' : 'upload'} size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>
                  {actionType === 'deposit' ? 'Déposer' : 'Retirer'}
                </Text>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.vaultIcon}>
          <Icon name={isUnlocked ? 'unlock' : 'lock'} size={32} color={COLORS.white} />
        </View>
        <Text style={styles.headerTitle}>Coffre-Fort</Text>
        <Text style={styles.headerSubtitle}>
          {isUnlocked ? 'Déverrouillé' : 'Sécurisé par PIN'}
        </Text>
        
        {/* Total Balance */}
        <View style={styles.totalBalanceContainer}>
          <Text style={styles.totalLabel}>Solde total</Text>
          <Text style={styles.totalAmount}>
            {isUnlocked 
              ? getTotalVaultBalance().toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
              : '••••••'
            }
          </Text>
        </View>

        {!isUnlocked && (
          <TouchableOpacity
            style={styles.unlockButton}
            onPress={() => setShowPinModal(true)}
          >
            <Icon name="unlock" size={18} color={COLORS.primary} />
            <Text style={styles.unlockButtonText}>Déverrouiller</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Balances by Currency */}
      {isUnlocked && (
        <View style={styles.balancesSection}>
          <Text style={styles.sectionTitle}>Soldes par devise</Text>
          {vaultData?.balances && Object.entries(vaultData.balances).map(([currency, balance]) => (
            <View key={currency} style={styles.balanceCard}>
              <View style={styles.currencyInfo}>
                <View style={styles.currencyIcon}>
                  <Text style={styles.currencySymbolLarge}>{CONFIG.CURRENCY_SYMBOLS[currency]}</Text>
                </View>
                <View>
                  <Text style={styles.currencyName}>{currency}</Text>
                  <Text style={styles.currencyFullName}>
                    {currency === 'EUR' ? 'Euro' : currency === 'USD' ? 'Dollar US' : currency === 'XOF' ? 'Franc CFA' : currency}
                  </Text>
                </View>
              </View>
              <Text style={styles.balanceAmount}>
                {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {CONFIG.CURRENCY_SYMBOLS[currency]}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      {isUnlocked && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.depositButton}
            onPress={() => openActionModal('deposit')}
          >
            <Icon name="download" size={20} color={COLORS.white} />
            <Text style={styles.depositButtonText}>Déposer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.withdrawButton}
            onPress={() => openActionModal('withdraw')}
          >
            <Icon name="upload" size={20} color={COLORS.primary} />
            <Text style={styles.withdrawButtonText}>Retirer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Security Info */}
      <View style={styles.securityInfo}>
        <Icon name="shield" size={20} color={COLORS.success} />
        <Text style={styles.securityText}>
          Vos fonds sont protégés par un cryptage de niveau bancaire
        </Text>
      </View>

      {renderPinModal()}
      {renderActionModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  headerCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xxl,
    alignItems: 'center',
    ...SHADOWS.card,
    marginBottom: SPACING.xl,
  },
  vaultIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.h2,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.xl,
  },
  totalBalanceContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  totalLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: FONT_SIZES.hero,
    fontWeight: '700',
    color: COLORS.white,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.sm,
  },
  unlockButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  balancesSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  currencySymbolLarge: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  currencyName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  currencyFullName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  balanceAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  depositButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  depositButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  withdrawButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  withdrawButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  securityText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xxl,
    width: '85%',
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  pinModalTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  pinModalSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  pinInputContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  pinDotFilled: {
    backgroundColor: COLORS.primary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
  },
  pinModalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  pinCancelButton: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
  },
  pinCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pinConfirmButton: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  pinConfirmText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  actionModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    width: '100%',
    position: 'absolute',
    bottom: 0,
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
  currencySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  currencyChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencyChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  currencyText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  currencyTextActive: {
    color: COLORS.white,
  },
  availableBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryBg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
  },
  availableLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  availableAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  amountInputWrapper: {
    marginBottom: SPACING.lg,
  },
  amountLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.h3,
    fontWeight: '700',
    color: COLORS.textTertiary,
    marginRight: SPACING.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: FONT_SIZES.h3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pinInputWrapper: {
    marginBottom: SPACING.xl,
  },
  pinInput: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
