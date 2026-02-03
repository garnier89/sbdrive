// Thème SBPAYGO Mobile - Orange 50%
// Palette de couleurs et styles globaux

export const COLORS = {
  // Couleurs principales - Orange 50%
  primary: '#f97316',
  primaryDark: '#ea580c',
  primaryLight: '#fb923c',
  primarySoft: '#fed7aa',
  primaryBg: '#fff7ed',
  
  // Couleurs secondaires
  secondary: '#3b82f6',
  secondaryDark: '#2563eb',
  secondaryLight: '#60a5fa',
  
  // Accents
  success: '#22c55e',
  successLight: '#dcfce7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#0ea5e9',
  infoLight: '#e0f2fe',
  
  // Neutres
  white: '#ffffff',
  black: '#000000',
  background: '#fff7ed',
  surface: '#ffffff',
  card: '#ffffff',
  
  // Textes
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  textInverse: '#ffffff',
  
  // Bordures
  border: '#fed7aa',
  borderLight: '#ffedd5',
  divider: '#f1f5f9',
  
  // Ombres
  shadow: 'rgba(249, 115, 22, 0.15)',
  shadowDark: 'rgba(0, 0, 0, 0.1)',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(249, 115, 22, 0.1)',
};

export const GRADIENTS = {
  primary: ['#f97316', '#ea580c'],
  primarySoft: ['#fff7ed', '#ffedd5'],
  card: ['#f97316', '#fb923c', '#ea580c'],
  success: ['#22c55e', '#16a34a'],
  blue: ['#3b82f6', '#2563eb'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  h3: 24,
  h2: 28,
  h1: 32,
  hero: 36,
};

export const FONT_WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
};

// Styles communs réutilisables
export const commonStyles = {
  // Containers
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  
  // Cards
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  cardPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.card,
  },
  
  // Buttons
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  buttonSecondary: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  
  // Inputs
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    height: 56,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputText: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
  },
  
  // Text styles
  h1: {
    fontSize: FONT_SIZES.h1,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  h2: {
    fontSize: FONT_SIZES.h2,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  h3: {
    fontSize: FONT_SIZES.h3,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
  },
  bodySmall: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  caption: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
  
  // Sections
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  
  // Flexbox helpers
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Dividers
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.lg,
  },
};

export default {
  COLORS,
  GRADIENTS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  commonStyles,
};
