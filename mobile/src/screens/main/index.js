// Placeholder screens - à compléter
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ title }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{title}</Text>
    <Text style={styles.subtext}>Écran en cours de développement</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  text: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtext: { fontSize: 14, color: '#64748b', marginTop: 8 },
});

export const TransferScreen = () => <PlaceholderScreen title="Transfert" />;
export const HistoryScreen = () => <PlaceholderScreen title="Historique" />;
export const CardsScreen = () => <PlaceholderScreen title="Cartes Virtuelles" />;
export const ProfileScreen = () => <PlaceholderScreen title="Profil" />;
export const VaultScreen = () => <PlaceholderScreen title="Coffre-Fort" />;
export const DepositScreen = () => <PlaceholderScreen title="Dépôt" />;

export default {
  TransferScreen,
  HistoryScreen,
  CardsScreen,
  ProfileScreen,
  VaultScreen,
  DepositScreen,
};
