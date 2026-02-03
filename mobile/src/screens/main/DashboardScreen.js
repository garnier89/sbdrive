// Écran Dashboard SBPAYGO Mobile
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../hooks/useAuth';
import { walletAPI } from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';
import CONFIG from '../../config';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [walletsRes, transactionsRes] = await Promise.all([
        walletAPI.getWallets(),
        walletAPI.getTransactions(5),
      ]);
      setWallets(walletsRes.data);
      setTransactions(transactionsRes.data.transactions);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatAmount = (amount, currency) => {
    const symbol = CONFIG.CURRENCY_SYMBOLS[currency] || currency;
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${symbol}`;
  };

  const getTotalBalance = () => {
    const mainWallet = wallets.find(w => w.currency === 'EUR') || wallets[0];
    if (!mainWallet) return { amount: 0, currency: 'EUR' };
    return { amount: mainWallet.balance, currency: mainWallet.currency };
  };

  const totalBalance = getTotalBalance();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.full_name?.split(' ')[0]}! 👋</Text>
          <Text style={styles.subGreeting}>Bienvenue sur SBPAYGO</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatar}>
            <Icon name="user" size={20} color="#f97316" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde total</Text>
        <Text style={styles.balanceAmount}>
          {totalBalance.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {CONFIG.CURRENCY_SYMBOLS[totalBalance.currency]}
        </Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity 
            style={styles.balanceButton}
            onPress={() => navigation.navigate('Deposit')}
          >
            <Icon name="plus" size={20} color="#ffffff" />
            <Text style={styles.balanceButtonText}>Dépôt</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.balanceButton}
            onPress={() => navigation.navigate('Transfer')}
          >
            <Icon name="send" size={20} color="#ffffff" />
            <Text style={styles.balanceButtonText}>Envoyer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.actionGrid}>
          {[
            { icon: 'send', label: 'Transfert', screen: 'Transfer' },
            { icon: 'credit-card', label: 'Cartes', screen: 'Cards' },
            { icon: 'lock', label: 'Coffre-Fort', screen: 'Vault' },
            { icon: 'smartphone', label: 'Mobile Money', screen: 'MobileMoney' },
          ].map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={() => navigation.navigate(action.screen)}
            >
              <View style={styles.actionIcon}>
                <Icon name={action.icon} size={24} color="#f97316" />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.transactions}>
        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Transactions récentes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.seeAllLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="inbox" size={48} color="#e2e8f0" />
            <Text style={styles.emptyText}>Aucune transaction</Text>
          </View>
        ) : (
          transactions.map((tx, index) => (
            <View key={tx.id} style={styles.transactionItem}>
              <View style={[styles.txIcon, tx.amount >= 0 ? styles.txIconIn : styles.txIconOut]}>
                <Icon
                  name={tx.amount >= 0 ? 'arrow-down-left' : 'arrow-up-right'}
                  size={16}
                  color={tx.amount >= 0 ? '#22c55e' : '#ef4444'}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDescription} numberOfLines={1}>
                  {tx.description || tx.type}
                </Text>
                <Text style={styles.txDate}>
                  {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Text style={[styles.txAmount, tx.amount >= 0 ? styles.txAmountIn : styles.txAmountOut]}>
                {formatAmount(tx.amount, tx.currency)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.xxl,
    paddingTop: 56,
    backgroundColor: COLORS.white,
  },
  greeting: {
    fontSize: FONT_SIZES.h3,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subGreeting: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  balanceCard: {
    margin: SPACING.lg,
    padding: SPACING.xxl,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xxl,
    ...SHADOWS.card,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZES.md,
  },
  balanceAmount: {
    color: COLORS.white,
    fontSize: FONT_SIZES.hero,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  balanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  balanceButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  quickActions: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  actionButton: {
    width: '47%',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  transactions: {
    padding: SPACING.lg,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  seeAllLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xxxl,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyText: {
    color: COLORS.textTertiary,
    marginTop: SPACING.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconIn: {
    backgroundColor: COLORS.successLight,
  },
  txIconOut: {
    backgroundColor: COLORS.errorLight,
  },
  txInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  txDescription: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  txDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  txAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  txAmountIn: {
    color: COLORS.success,
  },
  txAmountOut: {
    color: COLORS.error,
  },
});
