// Navigation principale SBPAYGO Mobile
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';

import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../styles/theme';

// Screens Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import QuickPinScreen from '../screens/auth/QuickPinScreen';

// Screens Main
import DashboardScreen from '../screens/main/DashboardScreen';
import TransferScreen from '../screens/main/TransferScreen';
import HistoryScreen from '../screens/main/HistoryScreen';
import CardsScreen from '../screens/main/CardsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import VaultScreen from '../screens/main/VaultScreen';
import DepositScreen from '../screens/main/DepositScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tabs principaux
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Dashboard':
              iconName = 'home';
              break;
            case 'Transfer':
              iconName = 'send';
              break;
            case 'Cards':
              iconName = 'credit-card';
              break;
            case 'History':
              iconName = 'clock';
              break;
            case 'Profile':
              iconName = 'user';
              break;
            default:
              iconName = 'circle';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 68,
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'Accueil' }}
      />
      <Tab.Screen 
        name="Transfer" 
        component={TransferScreen} 
        options={{ tabBarLabel: 'Envoyer' }}
      />
      <Tab.Screen 
        name="Cards" 
        component={CardsScreen} 
        options={{ tabBarLabel: 'Cartes' }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ tabBarLabel: 'Historique' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

// Navigation principale
export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Splash screen sera géré ici
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.white },
          headerTintColor: COLORS.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ title: 'Créer un compte' }}
            />
            <Stack.Screen 
              name="QuickPin" 
              component={QuickPinScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // Main Stack
          <>
            <Stack.Screen 
              name="Main" 
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Vault" 
              component={VaultScreen}
              options={{ title: 'Coffre-Fort' }}
            />
            <Stack.Screen 
              name="Deposit" 
              component={DepositScreen}
              options={{ title: 'Dépôt' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
