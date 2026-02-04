import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '@/App';
import { 
  MapPin, Navigation, Phone, Clock, Star, Search, 
  Filter, List, Map as MapIcon, Loader2, RefreshCw,
  Banknote, ArrowDownCircle, Smartphone, Zap, Send, ChevronRight
} from 'lucide-react';

// Leaflet imports
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon
const createCustomIcon = (color = '#f97316') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

// User location marker
const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `<div style="
    background-color: #3b82f6;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 4px solid white;
    box-shadow: 0 0 0 2px #3b82f6, 0 2px 10px rgba(59,130,246,0.5);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Service icons mapping
const serviceIcons = {
  cash_withdrawal: Banknote,
  deposit: ArrowDownCircle,
  mobile_money: Smartphone,
  airtime: Phone,
  bill_payment: Zap,
  transfer: Send
};

// Map center updater component
function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

const AgentLocatorPage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewMode, setViewMode] = useState('map');
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([14.6937, -17.4441]); // Default: Dakar
  const [searchRadius, setSearchRadius] = useState(10);
  const [countries, setCountries] = useState({});
  const [services, setServices] = useState({});
  const [gettingLocation, setGettingLocation] = useState(false);

  // Fetch countries and services
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [countriesRes, servicesRes] = await Promise.all([
          axios.get(`${API}/agents/countries`),
          axios.get(`${API}/agents/services`)
        ]);
        setCountries(countriesRes.data.countries || {});
        setServices(servicesRes.data.services || {});
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };
    fetchConfig();
  }, []);

  // Get user location
  const getUserLocation = useCallback(() => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          setMapCenter([latitude, longitude]);
          toast.success('Position trouvée');
          setGettingLocation(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Impossible d\'obtenir votre position');
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error('Géolocalisation non supportée');
      setGettingLocation(false);
    }
  }, []);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/agents/search?latitude=${userLocation?.latitude || 14.6937}&longitude=${userLocation?.longitude || -17.4441}&radius=${searchRadius}`;
      
      if (selectedCountry && selectedCountry !== 'all') {
        url = `${API}/agents/by-country/${selectedCountry}`;
      }
      
      if (selectedService && selectedService !== 'all') {
        url += `&service=${selectedService}`;
      }

      const response = await axios.get(url);
      setAgents(response.data.agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      // If no agents, try to seed
      if (error.response?.status === 404 || agents.length === 0) {
        try {
          await axios.post(`${API}/agents/admin/seed`);
          toast.info('Agents de démonstration créés');
          // Retry fetch
          const retryResponse = await axios.get(`${API}/agents/by-country/SN`);
          setAgents(retryResponse.data.agents || []);
        } catch (seedError) {
          console.error('Error seeding agents:', seedError);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userLocation, selectedCountry, selectedService, searchRadius]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Filter agents by search query
  const filteredAgents = agents.filter(agent => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      agent.business_name?.toLowerCase().includes(query) ||
      agent.city?.toLowerCase().includes(query) ||
      agent.address?.toLowerCase().includes(query)
    );
  });

  // Open navigation
  const openNavigation = (agent) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${agent.latitude},${agent.longitude}`;
    window.open(url, '_blank');
  };

  // Render service badge
  const ServiceBadge = ({ serviceCode }) => {
    const service = services[serviceCode];
    const Icon = serviceIcons[serviceCode] || MapPin;
    if (!service) return null;
    return (
      <Badge 
        variant="outline" 
        className="text-xs flex items-center gap-1"
        style={{ borderColor: service.color, color: service.color }}
      >
        <Icon className="w-3 h-3" />
        {service.name}
      </Badge>
    );
  };

  // Agent Card Component
  const AgentCard = ({ agent, compact = false }) => {
    // Check if agent is currently open
    const isOpen = () => {
      if (!agent.opening_hours) return null;
      const now = new Date();
      const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const hours = agent.opening_hours[day];
      if (!hours || hours.closed) return false;
      
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = (hours.open || '08:00').split(':').map(Number);
      const [closeH, closeM] = (hours.close || '18:00').split(':').map(Number);
      const openTime = openH * 60 + openM;
      const closeTime = closeH * 60 + closeM;
      
      return currentTime >= openTime && currentTime <= closeTime;
    };

    const openStatus = isOpen();
    const todayHours = () => {
      if (!agent.opening_hours) return null;
      const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
      const hours = agent.opening_hours[day];
      if (!hours || hours.closed) return 'Fermé';
      return `${hours.open || '08:00'} - ${hours.close || '18:00'}`;
    };

    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-lg ${selectedAgent?.id === agent.id ? 'ring-2 ring-orange-500' : ''}`}
        onClick={() => {
          setSelectedAgent(agent);
          setMapCenter([agent.latitude, agent.longitude]);
        }}
        data-testid={`agent-card-${agent.id}`}
      >
        <CardContent className={compact ? 'p-3' : 'p-4'}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>{agent.business_name}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {agent.city}, {countries[agent.country]?.name || agent.country}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {agent.distance !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {agent.distance} km
                </Badge>
              )}
              {openStatus !== null && (
                <Badge className={`text-xs ${openStatus ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                  {openStatus ? 'Ouvert' : 'Fermé'}
                </Badge>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">{agent.address}</p>
          
          {/* Opening Hours */}
          {!compact && todayHours() && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Clock className="w-3 h-3" />
              <span>Aujourd&apos;hui: {todayHours()}</span>
            </div>
          )}
          
          {/* Services */}
          <div className="flex flex-wrap gap-1 mb-2">
            {agent.services?.slice(0, compact ? 3 : 6).map(service => (
              <ServiceBadge key={service} serviceCode={service} />
            ))}
            {agent.services?.length > (compact ? 3 : 6) && (
              <Badge variant="outline" className="text-xs">
                +{agent.services.length - (compact ? 3 : 6)}
              </Badge>
            )}
          </div>

          {/* Rating and Actions */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{agent.rating?.toFixed(1) || 'N/A'}</span>
              <span>({agent.total_reviews || 0} avis)</span>
            </div>
            
            {!compact && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`tel:${agent.phone}`, '_self');
                  }}
                  data-testid={`call-agent-${agent.id}`}
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Appeler
                </Button>
                <Button 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openNavigation(agent);
                  }}
                  data-testid={`navigate-agent-${agent.id}`}
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  Y aller
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6" data-testid="agent-locator-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Localiser un Agent</h1>
            <p className="text-muted-foreground">Trouvez un agent SBPAYGO près de chez vous</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={getUserLocation}
              disabled={gettingLocation}
              data-testid="get-location-btn"
            >
              {gettingLocation ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4 mr-2" />
              )}
              Ma position
            </Button>
            <Button
              variant="outline"
              onClick={fetchAgents}
              disabled={loading}
              data-testid="refresh-agents-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un agent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>

              {/* Country Filter */}
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger data-testid="country-filter">
                  <SelectValue placeholder="Tous les pays" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les pays</SelectItem>
                  {Object.entries(countries).map(([code, country]) => (
                    <SelectItem key={code} value={code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Service Filter */}
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger data-testid="service-filter">
                  <SelectValue placeholder="Tous les services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les services</SelectItem>
                  {Object.entries(services).map(([code, service]) => (
                    <SelectItem key={code} value={code}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Radius */}
              <Select value={searchRadius.toString()} onValueChange={(v) => setSearchRadius(parseInt(v))}>
                <SelectTrigger data-testid="radius-filter">
                  <SelectValue placeholder="Rayon de recherche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 km</SelectItem>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="25">25 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                  <SelectItem value="100">100 km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={setViewMode} className="mb-4">
          <TabsList>
            <TabsTrigger value="map" className="flex items-center gap-2" data-testid="map-view-tab">
              <MapIcon className="w-4 h-4" />
              Carte
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2" data-testid="list-view-tab">
              <List className="w-4 h-4" />
              Liste ({filteredAgents.length})
            </TabsTrigger>
          </TabsList>

          {/* Map View */}
          <TabsContent value="map" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Map */}
              <div className="lg:col-span-2">
                <Card className="overflow-hidden">
                  <div className="h-[500px]" data-testid="map-container">
                    <MapContainer
                      center={mapCenter}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapCenterUpdater center={mapCenter} />
                      
                      {/* User location marker */}
                      {userLocation && (
                        <>
                          <Marker 
                            position={[userLocation.latitude, userLocation.longitude]}
                            icon={userLocationIcon}
                          >
                            <Popup>Votre position</Popup>
                          </Marker>
                          <Circle 
                            center={[userLocation.latitude, userLocation.longitude]}
                            radius={searchRadius * 1000}
                            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
                          />
                        </>
                      )}
                      
                      {/* Agent markers */}
                      {filteredAgents.map(agent => (
                        <Marker
                          key={agent.id}
                          position={[agent.latitude, agent.longitude]}
                          icon={createCustomIcon(selectedAgent?.id === agent.id ? '#22c55e' : '#f97316')}
                          eventHandlers={{
                            click: () => setSelectedAgent(agent)
                          }}
                        >
                          <Popup>
                            <div className="p-2 min-w-[200px]">
                              <h3 className="font-semibold text-sm">{agent.business_name}</h3>
                              <p className="text-xs text-gray-600">{agent.address}</p>
                              <p className="text-xs text-gray-600">{agent.city}</p>
                              <div className="flex gap-1 mt-2">
                                <Button 
                                  size="sm" 
                                  className="text-xs h-7"
                                  onClick={() => openNavigation(agent)}
                                >
                                  <Navigation className="w-3 h-3 mr-1" />
                                  Y aller
                                </Button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                </Card>
              </div>

              {/* Agent List Sidebar */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  </div>
                ) : filteredAgents.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Aucun agent trouvé</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Essayez d'élargir votre zone de recherche
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredAgents.map(agent => (
                    <AgentCard key={agent.id} agent={agent} compact />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun agent trouvé</h3>
                  <p className="text-muted-foreground">
                    Essayez de modifier vos filtres ou d'élargir votre zone de recherche
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAgents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Selected Agent Details */}
        {selectedAgent && (
          <Card className="mt-4 border-orange-200 bg-orange-50/50" data-testid="selected-agent-details">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  {selectedAgent.business_name}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAgent(null)}>
                  Fermer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Info */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                    <p>{selectedAgent.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAgent.city}, {countries[selectedAgent.country]?.name}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                    <p>{selectedAgent.phone}</p>
                  </div>

                  {selectedAgent.distance !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Distance</p>
                      <p>{selectedAgent.distance} km de votre position</p>
                    </div>
                  )}
                </div>

                {/* Services & Hours */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Services disponibles</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.services?.map(service => (
                        <ServiceBadge key={service} serviceCode={service} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Horaires
                    </p>
                    <div className="text-sm space-y-0.5">
                      {selectedAgent.opening_hours && Object.entries(selectedAgent.opening_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize text-muted-foreground">{day}</span>
                          <span>{hours === 'closed' ? 'Fermé' : hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4 pt-4 border-t">
                <Button 
                  className="flex-1"
                  onClick={() => openNavigation(selectedAgent)}
                  data-testid="navigate-selected-agent"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Itinéraire
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`tel:${selectedAgent.phone}`, '_self')}
                  data-testid="call-selected-agent"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Appeler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AgentLocatorPage;
