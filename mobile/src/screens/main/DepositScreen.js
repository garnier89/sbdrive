// Écran Dépôt SBPAYGO Mobile
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { walletAPI, depositAPI } from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';
import CONFIG from '../../config';

const DEPOSIT_METHODS = [
  { id: 'card', icon: 'credit-card', label: 'Carte bancaire', description: 'Visa, Mastercard' },
  { id: 'bank', icon: 'building', label: 'Virement bancaire', description: 'IBAN, SWIFT' },
  { id: 'mobile', icon: 'smartphone', label: 'Mobile Money', description: 'Orange, Wave, MTN' },
];

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function DepositScreen({ navigation }) {
  const [wallets, setWallets] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await walletAPI.getWallets();
      setWallets(response.data);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (value) => {
    setAmount(value.toString());
  };

  const handleDeposit = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (amountNum < 5) {
      Alert.alert('Erreur', 'Le montant minimum est de 5 €');
      return;
    }

    setProcessing(true);
    try {
      await depositAPI.create({
        amount: amountNum,
        currency: selectedCurrency,
        method: selectedMethod,
      });
      
      Alert.alert(
        'Dépôt initié ✓',
        `Votre dépôt de ${amountNum} ${CONFIG.CURRENCY_SYMBOLS[selectedCurrency]} est en cours de traitement`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de traiter le dépôt');
    } finally {
      setProcessing(false);
    }
  };

  const getSelectedWallet = () => {
    return wallets.find(w => w.currency === selectedCurrency);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ajouter des fonds</Text>
        <Text style={styles.headerSubtitle}>
          Choisissez une méthode de dépôt
        </Text>
      </View>

      {/* Deposit Methods */}
      <View style={styles.methodsSection}>
        {DEPOSIT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[styles.methodCard, selectedMethod === method.id && styles.methodCardActive]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <View style={[styles.methodIcon, selectedMethod === method.id && styles.methodIconActive]}>
              <Icon 
                name={method.icon} 
                size={24} 
                color={selectedMethod === method.id ? COLORS.white : COLORS.primary} 
              />
            </View>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodLabel, selectedMethod === method.id && styles.methodLabelActive]}>
                {method.label}
              </Text>
              <Text style={[styles.methodDescription, selectedMethod === method.id && styles.methodDescriptionActive]}>
                {method.description}
              </Text>
            </View>
            {selectedMethod === method.id && (
              <Icon name="check-circle" size={22} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Currency Selection */}
      <View style={styles.currencySection}>
        <Text style={styles.sectionTitle}>Devise</Text>
        <View style={styles.currencyGrid}>
          {wallets.map((wallet) => (
            <TouchableOpacity
              key={wallet.id}
              style={[styles.currencyCard, selectedCurrency === wallet.currency && styles.currencyCardActive]}
              onPress={() => setSelectedCurrency(wallet.currency)}
            >
              <Text style={[styles.currencySymbol, selectedCurrency === wallet.currency && styles.currencySymbolActive]}>
                {CONFIG.CURRENCY_SYMBOLS[wallet.currency]}
              </Text>
              <Text style={[styles.currencyCode, selectedCurrency === wallet.currency && styles.currencyCodeActive]}>
                {wallet.currency}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amount Section */}
      <View style={styles.amountSection}>
        <Text style={styles.sectionTitle}>Montant</Text>
        
        {/* Quick Amounts */}
        <View style={styles.quickAmountsGrid}>
          {QUICK_AMOUNTS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.quickAmountBtn, amount === value.toString() && styles.quickAmountBtnActive]}
              onPress={() => handleQuickAmount(value)}
            >
              <Text style={[styles.quickAmountText, amount === value.toString() && styles.quickAmountTextActive]}>
                {value} {CONFIG.CURRENCY_SYMBOLS[selectedCurrency]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Amount */}
        <View style={styles.customAmountContainer}>
          <Text style={styles.currencyPrefix}>{CONFIG.CURRENCY_SYMBOLS[selectedCurrency]}</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="Autre montant"
            placeholderTextColor={COLORS.textTertiary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Current Balance */}
      <View style={styles.balanceInfo}>
        <Icon name="wallet" size={18} color={COLORS.textSecondary} />
        <Text style={styles.balanceText}>
          Solde actuel: {getSelectedWallet()?.balance?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) || '0.00'} {CONFIG.CURRENCY_SYMBOLS[selectedCurrency]}
        </Text>
      </View>

      {/* Fees Info */}
      <View style={styles.feesInfo}>
        <Icon name="info" size={16} color={COLORS.info} />
        <Text style={styles.feesText}>
          {selectedMethod === 'card' && 'Frais: 1.5% • Crédit instantané'}
          {selectedMethod === 'bank' && 'Sans frais • Délai: 1-3 jours ouvrés'}
          {selectedMethod === 'mobile' && 'Frais: 1% • Crédit sous 24h'}
        </Text>
      </View>

      {/* Deposit Button */}
      <TouchableOpacity
        style={[styles.depositButton, processing && styles.buttonDisabled]}
        onPress={handleDeposit}
        disabled={processing}
      >
        {processing ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Icon name="plus-circle" size={20} color={COLORS.white} />
            <Text style={styles.depositButtonText}>
              Déposer {amount ? `${amount} ${CONFIG.CURRENCY_SYMBOLS[selectedCurrency]}` : ''}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Security Badge */}
      <View style={styles.securityBadge}>
        <Icon name="shield" size={16} color={COLORS.success} />
        <Text style={styles.securityText}>Paiement sécurisé SSL</Text>
      </View>
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
  methodsSection: {
    marginBottom: SPACING.xl,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  methodCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBg,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  methodIconActive: {
    backgroundColor: COLORS.primary,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  methodLabelActive: {
    color: COLORS.primary,
  },
  methodDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  methodDescriptionActive: {
    color: COLORS.textSecondary,
  },
  currencySection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  currencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  currencyCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  currencySymbolActive: {
    color: COLORS.white,
  },
  currencyCode: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  currencyCodeActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  amountSection: {
    marginBottom: SPACING.xl,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickAmountBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAmountBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickAmountText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  quickAmountTextActive: {
    color: COLORS.white,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencyPrefix: {
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
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  balanceText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  feesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  feesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.info,
    flex: 1,
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  depositButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  securityText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
});
