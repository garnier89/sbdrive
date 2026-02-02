// Écran d'inscription SB Pay Mobile
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || undefined,
      });
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Échec de l\'inscription'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Form */}
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Icon name="user" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nom complet *"
            placeholderTextColor="#94a3b8"
            value={formData.full_name}
            onChangeText={(text) => setFormData({ ...formData, full_name: text })}
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email *"
            placeholderTextColor="#94a3b8"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="phone" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Téléphone (optionnel)"
            placeholderTextColor="#94a3b8"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe *"
            placeholderTextColor="#94a3b8"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
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

        <View style={styles.inputContainer}>
          <Icon name="check-circle" size={20} color="#94a3b8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe *"
            placeholderTextColor="#94a3b8"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
            secureTextEntry={!showPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Créer mon compte</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Terms */}
      <Text style={styles.terms}>
        En créant un compte, vous acceptez nos{' '}
        <Text style={styles.termsLink}>Conditions d'utilisation</Text> et notre{' '}
        <Text style={styles.termsLink}>Politique de confidentialité</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 24,
    paddingTop: 16,
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
  terms: {
    marginTop: 24,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    color: '#f97316',
  },
});
