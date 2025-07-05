import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [contents, setContents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentlyWatching, setCurrentlyWatching] = useState(null);
  const [settings, setSettings] = useState({ registration_enabled: true });
  const [loading, setLoading] = useState(false);

  // Check if user is logged in on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser(token);
    }
  }, []);

  // Fetch current user info
  const fetchCurrentUser = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        if (user.role === 'admin') {
          setCurrentView('admin');
          fetchContents();
          fetchSettings();
        } else {
          setCurrentView('home');
          fetchPublicContents();
          fetchFavorites();
          fetchContinueWatching();
        }
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
    }
  };

  // Fetch contents (admin)
  const fetchContents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/contents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContents(data);
      }
    } catch (error) {
      console.error('Error fetching contents:', error);
    }
  };

  // Fetch public contents
  const fetchPublicContents = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`${API_BASE_URL}/api/contents?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setContents(data);
      }
    } catch (error) {
      console.error('Error fetching public contents:', error);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch favorites
  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  // Fetch continue watching
  const fetchContinueWatching = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/continue-watching`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContinueWatching(data);
      }
    } catch (error) {
      console.error('Error fetching continue watching:', error);
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Update public contents when filters change
  useEffect(() => {
    if (currentView === 'home') {
      fetchPublicContents();
    }
  }, [selectedCategory, searchTerm, currentView]);

  // Fetch categories on home view
  useEffect(() => {
    if (currentView === 'home') {
      fetchCategories();
    }
  }, [currentView]);

  // Toggle favorite
  const toggleFavorite = async (contentId, isFavorite) => {
    try {
      const token = localStorage.getItem('token');
      const method = isFavorite ? 'DELETE' : 'POST';
      const response = await fetch(`${API_BASE_URL}/api/favorites/${contentId}`, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchFavorites();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Check if content is favorite
  const isContentFavorite = (contentId) => {
    return favorites.some(fav => fav.content.id === contentId);
  };

  // Update watch progress
  const updateWatchProgress = async (contentId, watchedTime, totalDuration) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/watch-progress/${contentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          watched_time: watchedTime,
          total_duration: totalDuration
        })
      });
      
      if (response.ok) {
        fetchContinueWatching();
      }
    } catch (error) {
      console.error('Error updating watch progress:', error);
    }
  };

  // Login/Register component
  const AuthForm = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
        const endpoint = isLogin ? 'login' : 'register';
        const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('token', data.access_token);
          setCurrentUser(data.user);
          if (data.user.role === 'admin') {
            setCurrentView('admin');
            fetchContents();
            fetchSettings();
          } else {
            setCurrentView('home');
            fetchPublicContents();
            fetchFavorites();
            fetchContinueWatching();
          }
        } else {
          setError(data.detail || 'Authentication failed');
        }
      } catch (error) {
        setError('Network error. Please try again.');
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-red-600 mb-2">STREAMFLIX</h1>
            <p className="text-gray-300">
              {isLogin ? 'Connectez-vous pour continuer' : 'Créez votre compte'}
            </p>
          </div>
          
          <div className="bg-black bg-opacity-75 p-8 rounded-lg shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  required
                />
              </div>
              
              <div>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  required
                />
              </div>
              
              {error && (
                <div className="text-red-400 text-sm bg-red-900 bg-opacity-50 p-3 rounded">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Traitement...' : (isLogin ? 'Se connecter' : 'S\'inscrire')}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                {isLogin ? 'Pas de compte ? Inscrivez-vous' : 'Déjà un compte ? Connectez-vous'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Video Player Component
  const VideoPlayer = ({ content, onClose }) => {
    const [watchedTime, setWatchedTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);

    useEffect(() => {
      // Get initial watch progress
      const getProgress = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/api/watch-progress/${content.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setWatchedTime(data.watched_time);
            setTotalDuration(data.total_duration);
          }
        } catch (error) {
          console.error('Error getting watch progress:', error);
        }
      };

      getProgress();
    }, [content.id]);

    useEffect(() => {
      // Update watch progress every 30 seconds
      const interval = setInterval(() => {
        if (watchedTime > 0 && totalDuration > 0) {
          updateWatchProgress(content.id, watchedTime, totalDuration);
        }
      }, 30000);

      return () => clearInterval(interval);
    }, [watchedTime, totalDuration, content.id]);

    const getVideoEmbedUrl = () => {
      switch (content.video_source) {
        case 'vimeo':
          return content.video_url;
        case 'dailymotion':
          return content.video_url;
        case 'google_drive':
          // Convert Google Drive link to embed format
          const fileId = content.video_url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
          return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : content.video_url;
        default:
          return content.video_url;
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
        <div className="w-full max-w-6xl mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">{content.title}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-red-500 text-3xl"
            >
              ×
            </button>
          </div>
          
          <div className="video-player-container">
            <iframe
              src={getVideoEmbedUrl()}
              width="100%"
              height="600"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={content.title}
            />
          </div>
          
          <div className="mt-4 text-white">
            <p className="text-gray-300 mb-2">{content.description}</p>
            <div className="flex items-center space-x-4 text-sm">
              <span className="bg-red-600 px-2 py-1 rounded">{content.category}</span>
              <span>{content.year}</span>
              <span>{content.type === 'movie' ? 'Film' : 'Série'}</span>
              {content.duration && <span>{content.duration} min</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Content Card Component
  const ContentCard = ({ content, showProgress = false }) => {
    const isFavorite = isContentFavorite(content.id);
    const progressData = continueWatching.find(cw => cw.content.id === content.id);

    return (
      <div className="content-card bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <div className="relative">
          <img
            src={content.cover_image}
            alt={content.title}
            className="w-full h-64 object-cover"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/300x400?text=No+Image';
            }}
          />
          
          {/* Progress bar */}
          {showProgress && progressData && (
            <div className="absolute bottom-0 left-0 right-0 progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(progressData.watched_time / progressData.total_duration) * 100}%`
                }}
              />
            </div>
          )}
          
          {/* Favorite button */}
          <button
            onClick={() => toggleFavorite(content.id, isFavorite)}
            className={`absolute top-2 right-2 favorite-button ${isFavorite ? 'active' : ''}`}
          >
            ♥
          </button>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-white mb-2">{content.title}</h3>
          <p className="text-gray-400 text-sm mb-3 line-clamp-3">{content.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span className="bg-red-600 px-2 py-1 rounded text-xs">{content.category}</span>
              <span>{content.year}</span>
            </div>
            
            <button
              onClick={() => setCurrentlyWatching(content)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              ▶ Regarder
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Home Component (User Interface)
  const Home = () => {
    const logout = () => {
      localStorage.removeItem('token');
      setCurrentUser(null);
      setCurrentView('login');
    };

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-black bg-opacity-75 p-4 sticky top-0 z-40">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-red-600">STREAMFLIX</h1>
            
            {/* Navigation */}
            <nav className="flex space-x-6">
              <button
                onClick={() => setCurrentView('home')}
                className={`hover:text-red-400 transition-colors ${currentView === 'home' ? 'text-red-400' : ''}`}
              >
                Accueil
              </button>
              <button
                onClick={() => setCurrentView('favorites')}
                className={`hover:text-red-400 transition-colors ${currentView === 'favorites' ? 'text-red-400' : ''}`}
              >
                Mes favoris
              </button>
            </nav>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm">{currentUser?.email}</span>
              <button
                onClick={logout}
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {currentView === 'home' && (
            <>
              {/* Search and Filters */}
              <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <input
                    type="text"
                    placeholder="Rechercher un film ou une série..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-bar w-full md:w-96 text-white"
                  />
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`category-filter ${selectedCategory === 'all' ? 'active' : ''}`}
                    >
                      Tout
                    </button>
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`category-filter ${selectedCategory === category ? 'active' : ''}`}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Continue Watching */}
              {continueWatching.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">Continuer à regarder</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {continueWatching.map(item => (
                      <ContentCard
                        key={item.content.id}
                        content={item.content}
                        showProgress={true}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* All Content */}
              <section>
                <h2 className="text-2xl font-bold mb-4">
                  {selectedCategory === 'all' ? 'Tous les contenus' : `Catégorie: ${selectedCategory}`}
                  {searchTerm && ` - Recherche: "${searchTerm}"`}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {contents.map(content => (
                    <ContentCard key={content.id} content={content} />
                  ))}
                </div>
                
                {contents.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-lg">Aucun contenu trouvé</p>
                  </div>
                )}
              </section>
            </>
          )}

          {currentView === 'favorites' && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Mes favoris</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favorites.map(favorite => (
                  <ContentCard key={favorite.content.id} content={favorite.content} />
                ))}
              </div>
              
              {favorites.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">Vous n'avez pas encore de favoris</p>
                </div>
              )}
            </section>
          )}
        </main>

        {/* Video Player Modal */}
        {currentlyWatching && (
          <VideoPlayer
            content={currentlyWatching}
            onClose={() => setCurrentlyWatching(null)}
          />
        )}
      </div>
    );
  };

  // Admin Panel Component (keeping the existing admin functionality)
  const AdminPanel = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingContent, setEditingContent] = useState(null);
    const [stats, setStats] = useState({ total_users: 0, total_contents: 0, total_favorites: 0 });
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      category: 'comédie',
      video_url: '',
      video_source: 'vimeo',
      cover_image: '',
      type: 'movie',
      duration: '',
      year: ''
    });

    useEffect(() => {
      fetchStats();
    }, []);

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    const handleAddContent = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/contents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...formData,
            duration: formData.duration ? parseInt(formData.duration) : null,
            year: formData.year ? parseInt(formData.year) : null
          }),
        });

        if (response.ok) {
          await fetchContents();
          await fetchStats();
          setShowAddForm(false);
          setFormData({
            title: '',
            description: '',
            category: 'comédie',
            video_url: '',
            video_source: 'vimeo',
            cover_image: '',
            type: 'movie',
            duration: '',
            year: ''
          });
        }
      } catch (error) {
        console.error('Error adding content:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleUpdateContent = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/${editingContent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...formData,
            duration: formData.duration ? parseInt(formData.duration) : null,
            year: formData.year ? parseInt(formData.year) : null
          }),
        });

        if (response.ok) {
          await fetchContents();
          await fetchStats();
          setEditingContent(null);
          setFormData({
            title: '',
            description: '',
            category: 'comédie',
            video_url: '',
            video_source: 'vimeo',
            cover_image: '',
            type: 'movie',
            duration: '',
            year: ''
          });
        }
      } catch (error) {
        console.error('Error updating content:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleDeleteContent = async (contentId) => {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer ce contenu ?')) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/api/admin/contents/${contentId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            await fetchContents();
            await fetchStats();
          }
        } catch (error) {
          console.error('Error deleting content:', error);
        }
      }
    };

    const handleUpdateSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(settings),
        });

        if (response.ok) {
          alert('Paramètres mis à jour avec succès !');
        }
      } catch (error) {
        console.error('Error updating settings:', error);
      }
    };

    const startEditing = (content) => {
      setEditingContent(content);
      setFormData({
        title: content.title,
        description: content.description,
        category: content.category,
        video_url: content.video_url,
        video_source: content.video_source,
        cover_image: content.cover_image,
        type: content.type,
        duration: content.duration || '',
        year: content.year || ''
      });
    };

    const logout = () => {
      localStorage.removeItem('token');
      setCurrentUser(null);
      setCurrentView('login');
    };

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-black bg-opacity-75 p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-red-600">STREAMFLIX - Admin</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Connecté en tant que: {currentUser?.email}</span>
            <button
              onClick={logout}
              className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="p-6 bg-gray-800 m-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Tableau de bord</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold">Utilisateurs</h3>
              <p className="text-3xl font-bold text-red-600">{stats.total_users}</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold">Contenus</h3>
              <p className="text-3xl font-bold text-red-600">{stats.total_contents}</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold">Favoris</h3>
              <p className="text-3xl font-bold text-red-600">{stats.total_favorites}</p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="p-6 bg-gray-800 m-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Paramètres</h2>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.registration_enabled}
                onChange={(e) => setSettings({ ...settings, registration_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Autoriser les nouvelles inscriptions</span>
            </label>
            <button
              onClick={handleUpdateSettings}
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Sauvegarder
            </button>
          </div>
        </div>

        {/* Content Management */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Gestion des Contenus</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              {showAddForm ? 'Annuler' : 'Ajouter un contenu'}
            </button>
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingContent) && (
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingContent ? 'Modifier le contenu' : 'Ajouter un nouveau contenu'}
              </h3>
              <form onSubmit={editingContent ? handleUpdateContent : handleAddContent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Titre</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Catégorie</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <option value="comédie">Comédie</option>
                      <option value="drame">Drame</option>
                      <option value="horreur">Horreur</option>
                      <option value="action">Action</option>
                      <option value="science-fiction">Science-Fiction</option>
                      <option value="thriller">Thriller</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 h-20"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">URL de la vidéo</label>
                    <input
                      type="url"
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                      placeholder="https://player.vimeo.com/video/..."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Source vidéo</label>
                    <select
                      value={formData.video_source}
                      onChange={(e) => setFormData({ ...formData, video_source: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <option value="vimeo">Vimeo</option>
                      <option value="dailymotion">Dailymotion</option>
                      <option value="google_drive">Google Drive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Image de couverture (URL)</label>
                    <input
                      type="url"
                      value={formData.cover_image}
                      onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                      placeholder="https://example.com/image.jpg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <option value="movie">Film</option>
                      <option value="series">Série</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Année</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                      placeholder="2024"
                      min="1900"
                      max="2030"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-red-600 px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sauvegarde...' : (editingContent ? 'Modifier' : 'Ajouter')}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingContent(null);
                      setFormData({
                        title: '',
                        description: '',
                        category: 'comédie',
                        video_url: '',
                        video_source: 'vimeo',
                        cover_image: '',
                        type: 'movie',
                        duration: '',
                        year: ''
                      });
                    }}
                    className="bg-gray-600 px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Contents List */}
          <div className="bg-gray-800 rounded-lg">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold">Contenus existants ({contents.length})</h3>
            </div>
            
            <div className="divide-y divide-gray-700">
              {contents.map((content) => (
                <div key={content.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={content.cover_image}
                      alt={content.title}
                      className="w-16 h-24 object-cover rounded"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/64x96?text=No+Image';
                      }}
                    />
                    <div>
                      <h4 className="font-semibold">{content.title}</h4>
                      <p className="text-sm text-gray-400">{content.category} • {content.type}</p>
                      <p className="text-sm text-gray-400">{content.video_source}</p>
                      {content.year && <p className="text-sm text-gray-400">Année: {content.year}</p>}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEditing(content)}
                      className="bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteContent(content.id)}
                      className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
              
              {contents.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  Aucun contenu ajouté pour le moment.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render based on current view
  if (currentView === 'login') {
    return <AuthForm />;
  }

  if (currentView === 'admin') {
    return <AdminPanel />;
  }

  return <Home />;
}

export default App;