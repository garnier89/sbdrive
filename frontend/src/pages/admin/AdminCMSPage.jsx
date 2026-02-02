import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { API } from '@/App';
import axios from 'axios';
import { 
  FileText, Image, Save, Plus, Trash2, Edit2, 
  Globe, DollarSign, AlertCircle, Loader2, Search
} from 'lucide-react';

const CATEGORIES = [
  { code: 'general', name: 'Général', icon: FileText },
  { code: 'legal', name: 'Pages légales', icon: FileText },
  { code: 'marketing', name: 'Marketing', icon: FileText },
  { code: 'fees', name: 'Tarifs & Frais', icon: DollarSign },
  { code: 'errors', name: 'Messages d\'erreur', icon: AlertCircle },
];

const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

const CONTENT_TYPES = [
  { code: 'text', name: 'Texte simple' },
  { code: 'html', name: 'HTML' },
  { code: 'image', name: 'Image URL' },
  { code: 'json', name: 'JSON' },
];

export default function AdminCMSPage() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [selectedLanguage, setSelectedLanguage] = useState('fr');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New content form
  const [newContent, setNewContent] = useState({
    key: '',
    type: 'text',
    value: '',
    category: 'general',
    language: 'fr'
  });

  useEffect(() => {
    fetchContent();
  }, [selectedCategory, selectedLanguage]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/cms`, {
        params: {
          category: selectedCategory,
          language: selectedLanguage
        }
      });
      setContent(response.data.content || []);
    } catch (error) {
      toast.error('Erreur lors du chargement du contenu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (item) => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/cms/${item.id}`, {
        value: item.value,
        language: item.language
      });
      toast.success('Contenu mis à jour');
      setEditingItem(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newContent.key || !newContent.value) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${API}/admin/cms`, newContent);
      toast.success('Contenu créé');
      setShowAddForm(false);
      setNewContent({ key: '', type: 'text', value: '', category: 'general', language: 'fr' });
      fetchContent();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contentId) => {
    if (!confirm('Supprimer ce contenu ?')) return;
    
    try {
      await axios.delete(`${API}/admin/cms/${contentId}`);
      toast.success('Contenu supprimé');
      fetchContent();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredContent = content.filter(item => 
    item.key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.value?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Manrope']">Gestion du Contenu (CMS)</h1>
            <p className="text-muted-foreground">Modifiez les textes, images et tarifs de la plateforme</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau contenu
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[150px]">
              <Globe className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categories Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-5 w-full">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <TabsTrigger key={cat.code} value={cat.code} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{cat.name}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat.code} value={cat.code}>
              <Card>
                <CardHeader>
                  <CardTitle>{cat.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : filteredContent.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun contenu dans cette catégorie</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => {
                          setNewContent(prev => ({ ...prev, category: cat.code }));
                          setShowAddForm(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter du contenu
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredContent.map((item) => (
                        <div 
                          key={item.id}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                                  {item.key}
                                </code>
                                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                                  {item.type}
                                </span>
                              </div>
                              
                              {editingItem === item.id ? (
                                <div className="space-y-2">
                                  {item.type === 'html' ? (
                                    <Textarea
                                      value={item.value}
                                      onChange={(e) => {
                                        const updated = content.map(c => 
                                          c.id === item.id ? { ...c, value: e.target.value } : c
                                        );
                                        setContent(updated);
                                      }}
                                      rows={6}
                                      className="font-mono text-sm"
                                    />
                                  ) : item.type === 'json' ? (
                                    <Textarea
                                      value={item.value}
                                      onChange={(e) => {
                                        const updated = content.map(c => 
                                          c.id === item.id ? { ...c, value: e.target.value } : c
                                        );
                                        setContent(updated);
                                      }}
                                      rows={8}
                                      className="font-mono text-sm"
                                    />
                                  ) : (
                                    <Input
                                      value={item.value}
                                      onChange={(e) => {
                                        const updated = content.map(c => 
                                          c.id === item.id ? { ...c, value: e.target.value } : c
                                        );
                                        setContent(updated);
                                      }}
                                    />
                                  )}
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleSave(item)}
                                      disabled={saving}
                                    >
                                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                      Sauvegarder
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        setEditingItem(null);
                                        fetchContent();
                                      }}
                                    >
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm">
                                  {item.type === 'image' ? (
                                    <div className="flex items-center gap-4">
                                      <img 
                                        src={item.value} 
                                        alt={item.key}
                                        className="w-20 h-20 object-cover rounded"
                                        onError={(e) => e.target.style.display = 'none'}
                                      />
                                      <span className="text-muted-foreground truncate">{item.value}</span>
                                    </div>
                                  ) : item.type === 'json' ? (
                                    <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                      {item.value}
                                    </pre>
                                  ) : (
                                    <p className="text-muted-foreground line-clamp-2">{item.value}</p>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {editingItem !== item.id && (
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => setEditingItem(item.id)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Add Content Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle>Nouveau contenu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Clé unique</Label>
                    <Input
                      placeholder="welcome_message"
                      value={newContent.key}
                      onChange={(e) => setNewContent(prev => ({ ...prev, key: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select 
                      value={newContent.type} 
                      onValueChange={(v) => setNewContent(prev => ({ ...prev, type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map(type => (
                          <SelectItem key={type.code} value={type.code}>{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select 
                      value={newContent.category} 
                      onValueChange={(v) => setNewContent(prev => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.code} value={cat.code}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Langue</Label>
                    <Select 
                      value={newContent.language} 
                      onValueChange={(v) => setNewContent(prev => ({ ...prev, language: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Valeur</Label>
                  {newContent.type === 'text' || newContent.type === 'image' ? (
                    <Input
                      placeholder={newContent.type === 'image' ? 'https://...' : 'Votre texte...'}
                      value={newContent.value}
                      onChange={(e) => setNewContent(prev => ({ ...prev, value: e.target.value }))}
                    />
                  ) : (
                    <Textarea
                      placeholder={newContent.type === 'json' ? '{"key": "value"}' : '<p>HTML...</p>'}
                      value={newContent.value}
                      onChange={(e) => setNewContent(prev => ({ ...prev, value: e.target.value }))}
                      rows={6}
                      className="font-mono text-sm"
                    />
                  )}
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreate} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Créer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
