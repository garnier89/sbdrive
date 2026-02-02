// Service Biométrique pour SB Pay Mobile
import ReactNativeBiometrics from 'react-native-biometrics';
import CONFIG from '../config';
import storage from './storage';

const rnBiometrics = new ReactNativeBiometrics();

export const biometricService = {
  // Vérifier si la biométrie est disponible
  async isAvailable() {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      return {
        available,
        type: biometryType, // 'TouchID', 'FaceID', 'Biometrics'
      };
    } catch (error) {
      console.error('Biometric check error:', error);
      return { available: false, type: null };
    }
  },
  
  // Authentifier avec biométrie
  async authenticate() {
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: CONFIG.BIOMETRIC.PROMPT_MESSAGE,
        cancelButtonText: CONFIG.BIOMETRIC.CANCEL_BUTTON,
        fallbackPromptMessage: CONFIG.BIOMETRIC.FALLBACK_LABEL,
      });
      return success;
    } catch (error) {
      console.error('Biometric auth error:', error);
      return false;
    }
  },
  
  // Activer la biométrie pour l'utilisateur
  async enable() {
    const { available } = await this.isAvailable();
    if (!available) {
      throw new Error('Biométrie non disponible sur cet appareil');
    }
    
    const success = await this.authenticate();
    if (success) {
      await storage.setBiometricEnabled(true);
      return true;
    }
    return false;
  },
  
  // Désactiver la biométrie
  async disable() {
    await storage.setBiometricEnabled(false);
    return true;
  },
  
  // Vérifier si activée pour l'utilisateur
  async isEnabled() {
    return storage.getBiometricEnabled();
  },
  
  // Authentification biométrique + vérification activée
  async authenticateIfEnabled() {
    const enabled = await this.isEnabled();
    if (!enabled) {
      return { required: false, success: true };
    }
    
    const success = await this.authenticate();
    return { required: true, success };
  },
};

export default biometricService;
