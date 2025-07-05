import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [contents, setContents] = useState([]);
  const [categories, setCategories] = useState([]);
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
        } else {
          setCurrentView('home');
        }
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
    }
  };

  // Fetch contents
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

  // Login component
  const LoginForm = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
          } else {
            setCurrentView('home');
          }
        } else {
          setError(data.detail || 'Login failed');
        }
      } catch (error) {
        setError('Network error. Please try again.');
        console.error('Login error:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-red-600 mb-2">STREAMFLIX</h1>
            <p className="text-gray-300">Connectez-vous pour continuer</p>
          </div>
          
          <div className="bg-black bg-opacity-75 p-8 rounded-lg shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-6">
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
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Admin Panel Component
  const AdminPanel = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingContent, setEditingContent] = useState(null);
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
          }
        } catch (error) {
          console.error('Error deleting content:', error);
        }
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
    return <LoginForm />;
  }

  if (currentView === 'admin') {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">STREAMFLIX</h1>
        <p>Page d'accueil utilisateur (à développer)</p>
      </div>
    </div>
  );
}

export default App;