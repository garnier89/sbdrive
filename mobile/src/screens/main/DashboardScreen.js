// Écran Dashboard SB Pay Mobile
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f97316']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.full_name?.split(' ')[0]}! 👋</Text>
          <Text style={styles.subGreeting}>Bienvenue sur SB Pay</Text>
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 56,
    backgroundColor: '#ffffff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subGreeting: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fef3cd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#f97316',
    borderRadius: 20,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 4,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  balanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  balanceButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '47%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3cd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  transactions: {
    padding: 16,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllLink: {
    color: '#f97316',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  emptyText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconIn: {
    backgroundColor: '#dcfce7',
  },
  txIconOut: {
    backgroundColor: '#fee2e2',
  },
  txInfo: {
    flex: 1,
    marginLeft: 12,
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  txDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  txAmountIn: {
    color: '#22c55e',
  },
  txAmountOut: {
    color: '#ef4444',
  },
});
