// Écran Historique SBPAYGO Mobile
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { walletAPI } from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';
import CONFIG from '../../config';

const TRANSACTION_TYPES = {
  all: { label: 'Tout', icon: 'list' },
  transfer_in: { label: 'Reçus', icon: 'arrow-down-left' },
  transfer_out: { label: 'Envoyés', icon: 'arrow-up-right' },
  deposit: { label: 'Dépôts', icon: 'plus-circle' },
  withdrawal: { label: 'Retraits', icon: 'minus-circle' },
};

export default function HistoryScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchTransactions(true);
  }, [filter]);

  const fetchTransactions = async (reset = false) => {
    if (reset) {
      setPage(1);
      setLoading(true);
    }

    try {
      const currentPage = reset ? 1 : page;
      const response = await walletAPI.getTransactions(20, (currentPage - 1) * 20);
      let txList = response.data.transactions || [];
      
      // Filtrer si nécessaire
      if (filter !== 'all') {
        txList = txList.filter(tx => tx.type === filter);
      }
      
      if (reset) {
        setTransactions(txList);
      } else {
        setTransactions(prev => [...prev, ...txList]);
      }
      
      setHasMore(txList.length === 20);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions(true);
  }, [filter]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchTransactions(false);
    }
  };

  const formatAmount = (amount, currency) => {
    const symbol = CONFIG.CURRENCY_SYMBOLS[currency] || currency;
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${symbol}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'transfer_in':
      case 'p2p_transfer_in':
        return { name: 'arrow-down-left', color: COLORS.success };
      case 'transfer_out':
      case 'p2p_transfer_out':
        return { name: 'arrow-up-right', color: COLORS.error };
      case 'deposit':
        return { name: 'plus-circle', color: COLORS.success };
      case 'withdrawal':
        return { name: 'minus-circle', color: COLORS.error };
      case 'vault_deposit':
        return { name: 'lock', color: COLORS.secondary };
      case 'vault_withdrawal':
        return { name: 'unlock', color: COLORS.secondary };
      case 'card_payment':
        return { name: 'credit-card', color: COLORS.warning };
      default:
        return { name: 'activity', color: COLORS.textTertiary };
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { label: 'Terminé', color: COLORS.success, bg: COLORS.successLight };
      case 'pending':
        return { label: 'En attente', color: COLORS.warning, bg: COLORS.warningLight };
      case 'failed':
        return { label: 'Échoué', color: COLORS.error, bg: COLORS.errorLight };
      default:
        return { label: status, color: COLORS.textTertiary, bg: COLORS.divider };
    }
  };

  const renderTransaction = ({ item }) => {
    const iconInfo = getTransactionIcon(item.type);
    const statusInfo = getStatusBadge(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.transactionItem}
        onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
      >
        <View style={[styles.txIcon, { backgroundColor: item.amount >= 0 ? COLORS.successLight : COLORS.errorLight }]}>
          <Icon name={iconInfo.name} size={20} color={iconInfo.color} />
        </View>
        
        <View style={styles.txInfo}>
          <Text style={styles.txDescription} numberOfLines={1}>
            {item.description || item.type.replace('_', ' ')}
          </Text>
          <Text style={styles.txDate}>{formatDate(item.created_at)}</Text>
        </View>
        
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: item.amount >= 0 ? COLORS.success : COLORS.error }]}>
            {formatAmount(item.amount, item.currency)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Historique</Text>
      
      {/* Filtres */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={Object.entries(TRANSACTION_TYPES)}
        keyExtractor={([key]) => key}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item: [key, value] }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === key && styles.filterChipActive]}
            onPress={() => setFilter(key)}
          >
            <Icon 
              name={value.icon} 
              size={14} 
              color={filter === key ? COLORS.white : COLORS.textSecondary} 
            />
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {value.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Icon name="inbox" size={48} color={COLORS.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>Aucune transaction</Text>
      <Text style={styles.emptyText}>
        Vos transactions apparaîtront ici
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  header: {
    backgroundColor: COLORS.white,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.h2,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  filterContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    gap: SPACING.xs,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 4,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  separator: {
    height: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  footer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
});
