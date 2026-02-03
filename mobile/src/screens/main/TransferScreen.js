// Écran Transfert SBPAYGO Mobile
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../hooks/useAuth';
import { walletAPI, transferAPI } from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';
import CONFIG from '../../config';

const TRANSFER_METHODS = [
  { id: 'phone', icon: 'phone', label: 'Par téléphone' },
  { id: 'email', icon: 'mail', label: 'Par email' },
  { id: 'user', icon: 'user', label: 'Utilisateur SBPAYGO' },
];

export default function TransferScreen({ navigation }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('email');
  const [recipient, setRecipient] = useState('');
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [description, setDescription] = useState('');
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [fees, setFees] = useState(0);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await walletAPI.getWallets();
      setWallets(response.data);
      if (response.data.length > 0) {
        setCurrency(response.data[0].currency);
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const verifyRecipient = async () => {
    if (!recipient) {
      Alert.alert('Erreur', 'Veuillez entrer un destinataire');
      return;
    }

    setVerifying(true);
    try {
      const response = await transferAPI.verifyRecipient(method, recipient);
      if (response.data.found) {
        setRecipientInfo(response.data);
        setStep(2);
      } else {
        Alert.alert('Non trouvé', 'Aucun utilisateur trouvé avec ces informations');
      }
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Erreur de vérification');
    } finally {
      setVerifying(false);
    }
  };

  const calculateFees = () => {
    const amountNum = parseFloat(amount) || 0;
    // Frais de 0.5% avec minimum 0.50
    return Math.max(amountNum * 0.005, 0.50);
  };

  const getSelectedWallet = () => {
    return wallets.find(w => w.currency === currency);
  };

  const handleAmountChange = (value) => {
    // Permettre seulement les chiffres et un point décimal
    const cleaned = value.replace(/[^0-9.]/g, '');
    setAmount(cleaned);
    setFees(calculateFees());
  };

  const proceedToConfirmation = () => {
    const amountNum = parseFloat(amount);
    const wallet = getSelectedWallet();
    
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }
    
    if (!wallet || wallet.balance < (amountNum + calculateFees())) {
      Alert.alert('Solde insuffisant', 'Vous n\'avez pas assez de fonds pour ce transfert');
      return;
    }
    
    setFees(calculateFees());
    setStep(3);
  };

  const confirmTransfer = async () => {
    setLoading(true);
    try {
      await transferAPI.create({
        recipient_type: method,
        recipient_identifier: recipient,
        amount: parseFloat(amount),
        currency,
        description,
      });
      
      Alert.alert(
        'Transfert réussi! ✓',
        `${amount} ${CONFIG.CURRENCY_SYMBOLS[currency]} envoyé à ${recipientInfo?.name || recipient}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Erreur lors du transfert');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Choisir le destinataire</Text>
      
      {/* Méthodes de transfert */}
      <View style={styles.methodsContainer}>
        {TRANSFER_METHODS.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.methodButton, method === m.id && styles.methodButtonActive]}
            onPress={() => setMethod(m.id)}
          >
            <Icon 
              name={m.icon} 
              size={20} 
              color={method === m.id ? COLORS.white : COLORS.primary} 
            />
            <Text style={[styles.methodText, method === m.id && styles.methodTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Champ destinataire */}
      <View style={styles.inputContainer}>
        <Icon 
          name={method === 'phone' ? 'phone' : method === 'email' ? 'mail' : 'user'} 
          size={20} 
          color={COLORS.textTertiary} 
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={
            method === 'phone' ? '+221 77 123 4567' :
            method === 'email' ? 'destinataire@email.com' :
            'Nom d\'utilisateur'
          }
          placeholderTextColor={COLORS.textTertiary}
          value={recipient}
          onChangeText={setRecipient}
          keyboardType={method === 'phone' ? 'phone-pad' : method === 'email' ? 'email-address' : 'default'}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, verifying && styles.buttonDisabled]}
        onPress={verifyRecipient}
        disabled={verifying}
      >
        {verifying ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Vérifier</Text>
            <Icon name="arrow-right" size={20} color={COLORS.white} />
          </>
        )}
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Montant à envoyer</Text>

      {/* Info destinataire */}
      {recipientInfo && (
        <View style={styles.recipientCard}>
          <View style={styles.recipientAvatar}>
            <Icon name="user" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName}>{recipientInfo.name}</Text>
            <Text style={styles.recipientDetail}>{recipient}</Text>
          </View>
          <TouchableOpacity onPress={() => setStep(1)}>
            <Icon name="edit-2" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Sélection devise */}
      <View style={styles.currencySelector}>
        {wallets.map((wallet) => (
          <TouchableOpacity
            key={wallet.id}
            style={[styles.currencyChip, currency === wallet.currency && styles.currencyChipActive]}
            onPress={() => setCurrency(wallet.currency)}
          >
            <Text style={[styles.currencyText, currency === wallet.currency && styles.currencyTextActive]}>
              {CONFIG.CURRENCY_SYMBOLS[wallet.currency]}
            </Text>
            <Text style={[styles.currencyLabel, currency === wallet.currency && styles.currencyLabelActive]}>
              {wallet.currency}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Solde disponible */}
      <View style={styles.balanceInfo}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balanceAmount}>
          {getSelectedWallet()?.balance?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) || '0.00'} {CONFIG.CURRENCY_SYMBOLS[currency]}
        </Text>
      </View>

      {/* Champ montant */}
      <View style={styles.amountInputContainer}>
        <Text style={styles.currencySymbol}>{CONFIG.CURRENCY_SYMBOLS[currency]}</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor={COLORS.textTertiary}
          value={amount}
          onChangeText={handleAmountChange}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Description */}
      <View style={styles.inputContainer}>
        <Icon name="message-square" size={20} color={COLORS.textTertiary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Description (optionnel)"
          placeholderTextColor={COLORS.textTertiary}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={proceedToConfirmation}
      >
        <Text style={styles.primaryButtonText}>Continuer</Text>
        <Icon name="arrow-right" size={20} color={COLORS.white} />
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Confirmer le transfert</Text>

      <View style={styles.summaryCard}>
        {/* Destinataire */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Destinataire</Text>
          <Text style={styles.summaryValue}>{recipientInfo?.name}</Text>
        </View>
        
        <View style={styles.divider} />
        
        {/* Montant */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Montant</Text>
          <Text style={styles.summaryValueLarge}>
            {parseFloat(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {CONFIG.CURRENCY_SYMBOLS[currency]}
          </Text>
        </View>
        
        {/* Frais */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Frais</Text>
          <Text style={styles.summaryFees}>
            {fees.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {CONFIG.CURRENCY_SYMBOLS[currency]}
          </Text>
        </View>
        
        <View style={styles.divider} />
        
        {/* Total */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabelBold}>Total</Text>
          <Text style={styles.summaryTotal}>
            {(parseFloat(amount) + fees).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {CONFIG.CURRENCY_SYMBOLS[currency]}
          </Text>
        </View>

        {description && (
          <>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Note</Text>
              <Text style={styles.summaryNote}>{description}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setStep(2)}
        >
          <Icon name="arrow-left" size={20} color={COLORS.primary} />
          <Text style={styles.secondaryButtonText}>Modifier</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.primaryButton, styles.confirmButton, loading && styles.buttonDisabled]}
          onPress={confirmTransfer}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Icon name="check" size={20} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>Confirmer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.progressWrapper}>
              <View style={[styles.progressDot, step >= s && styles.progressDotActive]}>
                {step > s ? (
                  <Icon name="check" size={14} color={COLORS.white} />
                ) : (
                  <Text style={[styles.progressNumber, step >= s && styles.progressNumberActive]}>{s}</Text>
                )}
              </View>
              {s < 3 && <View style={[styles.progressLine, step > s && styles.progressLineActive]} />}
            </View>
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.xxxl,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressNumber: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  progressNumberActive: {
    color: COLORS.white,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.xs,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  stepTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
  methodsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  methodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  methodText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  methodTextActive: {
    color: COLORS.white,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    height: 56,
    marginBottom: SPACING.lg,
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 56,
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  recipientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  recipientName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  recipientDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  currencySelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  currencyChip: {
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
  currencyChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  currencyText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  currencyTextActive: {
    color: COLORS.white,
  },
  currencyLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  currencyLabelActive: {
    color: COLORS.white,
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.primaryBg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  balanceAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.hero,
    fontWeight: '700',
    color: COLORS.textTertiary,
    marginRight: SPACING.sm,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 100,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  summaryLabelBold: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  summaryValueLarge: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryFees: {
    fontSize: FONT_SIZES.md,
    color: COLORS.success,
  },
  summaryTotal: {
    fontSize: FONT_SIZES.h3,
    fontWeight: '700',
    color: COLORS.primary,
  },
  summaryNote: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    height: 56,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
  },
});
