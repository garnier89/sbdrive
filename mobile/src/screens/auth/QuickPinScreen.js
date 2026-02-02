// Écran PIN Rapide SB Pay Mobile
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';
import storage from '../../services/storage';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_ce75e416-36f1-4b25-8491-7de5dd466427/artifacts/jsqaea98_1024x1024%20%281030%20x%201024%20px%29_20251125_175229_0000.png';

export default function QuickPinScreen({ navigation }) {
  const { loginWithPin } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    checkDevice();
  }, []);

  const checkDevice = async () => {
    try {
      const deviceToken = await storage.getDeviceToken();
      if (!deviceToken) {
        navigation.replace('Login');
        return;
      }

      const response = await authAPI.checkDevice(deviceToken);
      if (!response.data.valid) {
        await storage.removeDeviceToken();
        navigation.replace('Login');
        return;
      }

      setUserInfo({
        name: response.data.user_hint,
        email: response.data.email_masked,
      });
      setIsLocked(response.data.is_locked);
    } catch (error) {
      navigation.replace('Login');
    } finally {
      setLoading(false);
    }
  };

  const handleNumberPress = (num) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto-submit quand 4-6 chiffres
      if (newPin.length >= 4) {
        handleSubmit(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async (pinToSubmit) => {
    setLoading(true);
    try {
      await loginWithPin(pinToSubmit);
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'PIN incorrect'
      );
      setPin('');
      
      if (error.response?.status === 423) {
        setIsLocked(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !userInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} />
        <Text style={styles.greeting}>Bonjour, {userInfo?.name}!</Text>
        <Text style={styles.email}>{userInfo?.email}</Text>
      </View>

      {isLocked ? (
        <View style={styles.lockedContainer}>
          <Icon name="lock" size={48} color="#ef4444" />
          <Text style={styles.lockedTitle}>Compte verrouillé</Text>
          <Text style={styles.lockedText}>
            Trop de tentatives. Réessayez dans 30 minutes ou utilisez la connexion classique.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.backButtonText}>Connexion classique</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* PIN Display */}
          <View style={styles.pinContainer}>
            <Text style={styles.pinLabel}>Entrez votre PIN</Text>
            <View style={styles.pinDots}>
              {[...Array(6)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    i < pin.length && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Number Pad */}
          <View style={styles.numPad}>
            {[[1, 2, 3], [4, 5, 6], [7, 8, 9], ['', 0, 'del']].map((row, i) => (
              <View key={i} style={styles.numRow}>
                {row.map((num, j) => (
                  <TouchableOpacity
                    key={j}
                    style={[
                      styles.numButton,
                      num === '' && styles.numButtonEmpty,
                    ]}
                    onPress={() => {
                      if (num === 'del') handleDelete();
                      else if (num !== '') handleNumberPress(String(num));
                    }}
                    disabled={num === '' || loading}
                  >
                    {num === 'del' ? (
                      <Icon name="delete" size={24} color="#1e293b" />
                    ) : (
                      <Text style={styles.numText}>{num}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.replace('Login')}
          >
            <Icon name="arrow-left" size={16} color="#64748b" />
            <Text style={styles.backLinkText}>Utiliser email et mot de passe</Text>
          </TouchableOpacity>
        </>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 32,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
  },
  lockedText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  pinLabel: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 12,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  pinDotFilled: {
    backgroundColor: '#f97316',
  },
  numPad: {
    gap: 12,
  },
  numRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  numButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numButtonEmpty: {
    backgroundColor: 'transparent',
  },
  numText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1e293b',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 8,
  },
  backLinkText: {
    color: '#64748b',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
