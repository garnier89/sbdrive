// Écran Profil SBPAYGO Mobile
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../styles/theme';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_ce75e416-36f1-4b25-8491-7de5dd466427/artifacts/jsqaea98_1024x1024%20%281030%20x%201024%20px%29_20251125_175229_0000.png';

const MENU_ITEMS = [
  {
    id: 'account',
    title: 'Compte',
    items: [
      { id: 'personal', icon: 'user', label: 'Informations personnelles', screen: 'PersonalInfo' },
      { id: 'security', icon: 'shield', label: 'Sécurité', screen: 'Security' },
      { id: 'kyc', icon: 'file-text', label: 'Vérification KYC', screen: 'KYC', badge: 'Vérifié' },
      { id: 'devices', icon: 'smartphone', label: 'Appareils connectés', screen: 'Devices' },
    ],
  },
  {
    id: 'preferences',
    title: 'Préférences',
    items: [
      { id: 'notifications', icon: 'bell', label: 'Notifications', toggle: true },
      { id: 'biometric', icon: 'fingerprint', label: 'Authentification biométrique', toggle: true },
      { id: 'language', icon: 'globe', label: 'Langue', value: 'Français' },
      { id: 'currency', icon: 'dollar-sign', label: 'Devise par défaut', value: 'EUR' },
    ],
  },
  {
    id: 'support',
    title: 'Aide & Support',
    items: [
      { id: 'help', icon: 'help-circle', label: 'Centre d\'aide', screen: 'Help' },
      { id: 'contact', icon: 'message-circle', label: 'Nous contacter', screen: 'Contact' },
      { id: 'faq', icon: 'book-open', label: 'FAQ', screen: 'FAQ' },
    ],
  },
  {
    id: 'legal',
    title: 'Légal',
    items: [
      { id: 'terms', icon: 'file', label: 'Conditions d\'utilisation', screen: 'Terms' },
      { id: 'privacy', icon: 'lock', label: 'Politique de confidentialité', screen: 'Privacy' },
    ],
  },
];

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    biometric: false,
  });

  const handleToggle = (id) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleMenuPress = (item) => {
    if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  const getKYCStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      default:
        return COLORS.error;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </Text>
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Icon name="camera" size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userName}>{user?.full_name || 'Utilisateur'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
        
        {/* KYC Status */}
        <View style={styles.kycBadge}>
          <Icon name="check-circle" size={14} color={COLORS.success} />
          <Text style={styles.kycText}>Compte vérifié</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="credit-card" size={20} color={COLORS.primary} />
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Cartes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="repeat" size={20} color={COLORS.primary} />
          <Text style={styles.statValue}>127</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="star" size={20} color={COLORS.primary} />
          <Text style={styles.statValue}>Gold</Text>
          <Text style={styles.statLabel}>Niveau</Text>
        </View>
      </View>

      {/* Menu Sections */}
      {MENU_ITEMS.map((section) => (
        <View key={section.id} style={styles.menuSection}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index < section.items.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => !item.toggle && handleMenuPress(item)}
                disabled={item.toggle}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIcon}>
                    <Icon name={item.icon} size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </View>
                
                <View style={styles.menuItemRight}>
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  {item.value && (
                    <Text style={styles.menuValue}>{item.value}</Text>
                  )}
                  {item.toggle ? (
                    <Switch
                      value={settings[item.id]}
                      onValueChange={() => handleToggle(item.id)}
                      trackColor={{ false: COLORS.border, true: COLORS.primarySoft }}
                      thumbColor={settings[item.id] ? COLORS.primary : COLORS.white}
                    />
                  ) : (
                    <Icon name="chevron-right" size={18} color={COLORS.textTertiary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="log-out" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Image source={{ uri: LOGO_URL }} style={styles.appLogo} />
        <Text style={styles.appName}>SBPAYGO</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  avatarText: {
    fontSize: FONT_SIZES.h1,
    fontWeight: '700',
    color: COLORS.white,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: FONT_SIZES.h3,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  kycText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.success,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.sm,
  },
  menuSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  badge: {
    backgroundColor: COLORS.successLight,
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.success,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.errorLight,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  logoutText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.error,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  appLogo: {
    width: 40,
    height: 40,
    marginBottom: SPACING.sm,
  },
  appName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  appVersion: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
