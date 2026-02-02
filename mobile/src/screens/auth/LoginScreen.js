// Écran de connexion SB Pay Mobile
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../hooks/useAuth';
import storage from '../../services/storage';
import biometricService from '../../services/biometric';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_ce75e416-36f1-4b25-8491-7de5dd466427/artifacts/jsqaea98_1024x1024%20%281030%20x%201024%20px%29_20251125_175229_0000.png';

export default function LoginScreen({ navigation }) {
  const { login, loginWithBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasQuickPin, setHasQuickPin] = useState(false);

  useEffect(() => {
    checkBiometricAndPin();
  }, []);

  const checkBiometricAndPin = async () => {
    // Vérifier si biométrie disponible
    const { available } = await biometricService.isAvailable();
    setBiometricAvailable(available);
    
    // Vérifier si PIN configuré
    const deviceToken = await storage.getDeviceToken();
    setHasQuickPin(!!deviceToken);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert(
        'Erreur de connexion',
        error.response?.data?.detail || 'Identifiants incorrects'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      await loginWithBiometric();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Authentification échouée');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPinLogin = () => {
    navigation.navigate('QuickPin');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} />
          <Text style={styles.title}>SB Pay</Text>
          <Text style={styles.subtitle}>Connexion</Text>
        </View>

        {/* Quick Actions */}
        {(biometricAvailable || hasQuickPin) && (
          <View style={styles.quickActions}>
            {hasQuickPin && (
              <TouchableOpacity
                style={styles.quickButton}
                onPress={handleQuickPinLogin}
              >
                <Icon name="hash" size={24} color="#f97316" />
                <Text style={styles.quickButtonText}>PIN rapide</Text>
              </TouchableOpacity>
            )}
            {biometricAvailable && (
              <TouchableOpacity
                style={styles.quickButton}
                onPress={handleBiometricLogin}
              >
                <Icon name="fingerprint" size={24} color="#f97316" />
                <Text style={styles.quickButtonText}>Empreinte</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Divider */}
        {(biometricAvailable || hasQuickPin) && (
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Icon name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#94a3b8"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f97316',
    gap: 8,
  },
  quickButtonText: {
    color: '#f97316',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94a3b8',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  button: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#64748b',
  },
  footerLink: {
    color: '#f97316',
    fontWeight: '600',
  },
});
