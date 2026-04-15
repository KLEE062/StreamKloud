import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, uploadString, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, User, Disc, Plus, Loader2, ArrowLeft, LogOut, Search, Trash2, Edit, ExternalLink, LayoutDashboard, TrendingUp } from 'lucide-react';
import { Artist, Album, Song } from '@/types';
import { useNavigate, Link } from 'react-router-dom';
import { logout } from '@/lib/firebase';
import { toast } from 'sonner';

export function Admin() {
  const [user, authLoading] = useAuthState(auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Capture console logs for mobile debugging
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      setDebugLogs(prev => [...prev, `LOG: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`].slice(-20));
      originalLog(...args);
    };

    console.error = (...args) => {
      setDebugLogs(prev => [...prev, `ERROR: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`].slice(-20));
      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  // Artist Form
  const [artistName, setArtistName] = useState('');
  const [artistBio, setArtistBio] = useState('');
  const [artistImage, setArtistImage] = useState<File | null>(null);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);

  // Album Form
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumArtistId, setAlbumArtistId] = useState('');
  const [albumCover, setAlbumCover] = useState<File | null>(null);
  const [albumYear, setAlbumYear] = useState(new Date().getFullYear());
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);

  // Song Form
  const [songTitle, setSongTitle] = useState('');
  const [songArtistId, setSongArtistId] = useState('');
  const [songAlbumId, setSongAlbumId] = useState('');
  const [songAudio, setSongAudio] = useState<File | null>(null);
  const [songCover, setSongCover] = useState<File | null>(null);
  const [songGenre, setSongGenre] = useState('');
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const isAdmin = user?.email === 'twesigyekelly90@gmail.com';

  useEffect(() => {
    if (isAdmin) {
      console.log('Admin detected, fetching data...');
      console.log('Backend Token exists:', !!localStorage.getItem('token'));
      console.log('Storage Bucket:', storage.app.options.storageBucket);
      fetchArtists();
      fetchAlbums();
      fetchSongs();
    }
  }, [isAdmin]);

  const fetchSongs = async () => {
    try {
      const response = await fetch('/api/songs');
      const data = await response.json();
      setSongs(data.map((s: any) => ({ id: s._id, ...s })));
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  const fetchArtists = async () => {
    try {
      const response = await fetch('/api/artists');
      const data = await response.json();
      setArtists(data.map((a: any) => ({ id: a._id, ...a })));
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const fetchAlbums = async () => {
    try {
      const response = await fetch('/api/albums');
      const data = await response.json();
      setAlbums(data.map((a: any) => ({ id: a._id, ...a })));
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  const handleAddArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const toastId = toast.loading('Initializing upload...');
    
    try {
      let imageUrl = '';
      if (artistImage) {
        console.log('Processing Artist Image as Base64...');
        if (artistImage.size > 1 * 1024 * 1024) {
          toast.error('Image too large for mobile upload (max 1MB)');
          setLoading(false);
          return;
        }

        toast.loading('Converting image...', { id: toastId });
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(artistImage);
        });
        
        imageUrl = await base64Promise;
        console.log('Image converted successfully');
      }

      toast.loading('Saving to database...', { id: toastId });
      const response = await fetch('/api/artists', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: artistName,
          bio: artistBio,
          imageUrl,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add artist');
      }

      setArtistName('');
      setArtistBio('');
      setArtistImage(null);
      fetchArtists();
      toast.success('Artist added successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Add Artist Error:', error);
      const isStorageError = error.code && error.code.startsWith('storage/');
      const errorSource = isStorageError ? 'Storage' : 'Firestore';
      toast.error(`${errorSource} Error: ${error.message || 'Permission denied'}`, { id: toastId });
      if (!isStorageError) {
        handleFirestoreError(error, OperationType.CREATE, 'artists');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditArtist = (artist: Artist) => {
    setEditingArtist(artist);
    setArtistName(artist.name);
    setArtistBio(artist.bio || '');
    // We don't set artistImage because it's a File object, but we'll show the current image in the UI
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Editing ${artist.name}`);
  };

  const handleUpdateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArtist || loading) return;
    setLoading(true);
    const toastId = toast.loading('Updating artist...');

    try {
      let imageUrl = editingArtist.imageUrl;
      if (artistImage) {
        if (artistImage.size > 1 * 1024 * 1024) {
          toast.error('Image too large (max 1MB)');
          setLoading(false);
          return;
        }
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(artistImage);
        });
        imageUrl = await base64Promise;
      }

      const response = await fetch(`/api/artists/${editingArtist.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: artistName,
          bio: artistBio,
          imageUrl,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update artist');
      }

      setEditingArtist(null);
      setArtistName('');
      setArtistBio('');
      setArtistImage(null);
      fetchArtists();
      toast.success('Artist updated successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Update Artist Error:', error);
      toast.error(`Error: ${error.message || 'Failed to update artist'}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAlbum = (album: Album) => {
    setEditingAlbum(album);
    setAlbumTitle(album.title);
    setAlbumArtistId(album.artistId);
    setAlbumYear(album.releaseYear || new Date().getFullYear());
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Editing ${album.title}`);
  };

  const handleUpdateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbum || loading) return;
    setLoading(true);
    const toastId = toast.loading('Updating album...');

    try {
      let coverUrl = editingAlbum.coverUrl;
      if (albumCover) {
        if (albumCover.size > 1 * 1024 * 1024) {
          toast.error('Cover too large (max 1MB)');
          setLoading(false);
          return;
        }
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(albumCover);
        });
        coverUrl = await base64Promise;
      }

      const artist = artists.find(a => a.id === albumArtistId);

      const response = await fetch(`/api/albums/${editingAlbum.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: albumTitle,
          artist: artist?.name || 'Unknown',
          artistId: albumArtistId,
          coverUrl,
          releaseYear: albumYear,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update album');
      }

      setEditingAlbum(null);
      setAlbumTitle('');
      setAlbumCover(null);
      fetchAlbums();
      toast.success('Album updated successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Update Album Error:', error);
      toast.error(`Error: ${error.message || 'Failed to update album'}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const toastId = toast.loading('Initializing album upload...');
    
    try {
      let coverUrl = '';
      if (albumCover) {
        console.log('Processing Album Cover as Base64...');
        if (albumCover.size > 1 * 1024 * 1024) {
          toast.error('Cover too large (max 1MB)');
          setLoading(false);
          return;
        }

        toast.loading('Converting cover...', { id: toastId });
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(albumCover);
        });
        
        coverUrl = await base64Promise;
      }

      const artist = artists.find(a => a.id === albumArtistId);

      toast.loading('Saving album to database...', { id: toastId });
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: albumTitle,
          artist: artist?.name || 'Unknown',
          artistId: albumArtistId,
          coverUrl,
          releaseYear: albumYear,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add album');
      }

      setAlbumTitle('');
      setAlbumCover(null);
      fetchAlbums();
      toast.success('Album added successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Add Album Error:', error);
      const isStorageError = error.code && error.code.startsWith('storage/');
      const errorSource = isStorageError ? 'Storage' : 'Firestore';
      toast.error(`${errorSource} Error: ${error.message || 'Permission denied'}`, { id: toastId });
      if (!isStorageError) {
        handleFirestoreError(error, OperationType.CREATE, 'albums');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!songAudio) {
      toast.error('Please select an audio file');
      return;
    }
    if (!songArtistId) {
      toast.error('Please select an artist');
      return;
    }
    setLoading(true);
    const toastId = toast.loading('Initializing song upload...');
    
    try {
      console.log('Uploading Song Audio:', {
        name: songAudio.name,
        size: `${(songAudio.size / 1024 / 1024).toFixed(2)} MB`,
        type: songAudio.type
      });
      if (songAudio.size > 20 * 1024 * 1024) {
        toast.error('Audio file too large (max 20MB)');
        setLoading(false);
        return;
      }

      toast.loading(`Uploading audio: ${songAudio.name}...`, { id: toastId });
      const audioRef = ref(storage, `songs/${Date.now()}_${songAudio.name}`);
      
      const audioUploadTask = uploadBytesResumable(audioRef, songAudio, { contentType: songAudio.type });
      
      const audioUrl = await new Promise<string>((resolve, reject) => {
        audioUploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            toast.loading(`Uploading audio: ${Math.round(progress)}%`, { id: toastId });
          }, 
          (error) => {
            console.error('Song Audio Upload Error:', error);
            reject(new Error(`Audio upload failed: ${error.message}`));
          }, 
          async () => {
            const url = await getDownloadURL(audioUploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      let coverUrl = '';
      if (songCover) {
        console.log('Processing Song Cover as Base64...');
        if (songCover.size > 1 * 1024 * 1024) {
          toast.error('Cover too large (max 1MB)');
          setLoading(false);
          return;
        }

        toast.loading('Converting cover...', { id: toastId });
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(songCover);
        });
        
        coverUrl = await base64Promise;
      } else if (songAlbumId) {
        const album = albums.find(a => a.id === songAlbumId);
        coverUrl = album?.coverUrl || '';
      }

      const artist = artists.find(a => a.id === songArtistId);
      const album = albums.find(a => a.id === songAlbumId);

      toast.loading('Processing audio metadata...', { id: toastId });
      // Get duration with timeout using local URL for speed and reliability
      const duration = await new Promise<number>((resolve) => {
        const audio = new Audio();
        const localUrl = URL.createObjectURL(songAudio);
        audio.src = localUrl;
        
        const timeout = setTimeout(() => {
          console.warn('Audio metadata load timed out');
          URL.revokeObjectURL(localUrl);
          resolve(0);
        }, 10000);

        audio.onloadedmetadata = () => {
          clearTimeout(timeout);
          const dur = audio.duration;
          URL.revokeObjectURL(localUrl);
          resolve(dur);
        };
        audio.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(localUrl);
          resolve(0);
        };
      });

      toast.loading('Saving song to database...', { id: toastId });
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: songTitle,
          artist: artist?.name || 'Unknown',
          url: audioUrl,
          coverImage: coverUrl,
          duration,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add song');
      }

      setSongTitle('');
      setSongAudio(null);
      setSongCover(null);
      fetchSongs();
      toast.success('Song added successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Add Song Error:', error);
      const isStorageError = error.code && error.code.startsWith('storage/');
      const errorSource = isStorageError ? 'Storage' : 'Firestore';
      toast.error(`${errorSource} Error: ${error.message || 'Permission denied'}`, { id: toastId });
      if (!isStorageError) {
        handleFirestoreError(error, OperationType.CREATE, 'songs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    setSongTitle(song.title);
    // Find artist and album IDs if possible
    const artist = artists.find(a => a.name === song.artist);
    if (artist) setSongArtistId(artist.id);
    
    // For album, we might need to search through albums
    const album = albums.find(a => a.songIds?.includes(song.id) || a.coverUrl === song.coverUrl);
    if (album) setSongAlbumId(album.id);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Editing ${song.title}`);
  };

  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong || loading) return;
    setLoading(true);
    const toastId = toast.loading('Updating song...');

    try {
      let audioUrl = editingSong.url;
      if (songAudio) {
        if (songAudio.size > 20 * 1024 * 1024) {
          toast.error('Audio file too large (max 20MB)');
          setLoading(false);
          return;
        }
        const audioRef = ref(storage, `songs/${Date.now()}_${songAudio.name}`);
        const uploadTask = await uploadBytes(audioRef, songAudio);
        audioUrl = await getDownloadURL(uploadTask.ref);
      }

      let coverUrl = editingSong.coverUrl;
      if (songCover) {
        if (songCover.size > 1 * 1024 * 1024) {
          toast.error('Cover too large (max 1MB)');
          setLoading(false);
          return;
        }
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(songCover);
        });
        coverUrl = await base64Promise;
      }

      const artist = artists.find(a => a.id === songArtistId);

      const response = await fetch(`/api/songs/${editingSong.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: songTitle,
          artist: artist?.name || 'Unknown',
          url: audioUrl,
          coverImage: coverUrl,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update song');
      }

      setEditingSong(null);
      setSongTitle('');
      setSongAudio(null);
      setSongCover(null);
      fetchSongs();
      toast.success('Song updated successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Update Song Error:', error);
      toast.error(`Error: ${error.message || 'Failed to update song'}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const response = await fetch(`/api/${collectionName}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete item');
      
      toast.success('Item deleted successfully');
      if (collectionName === 'artists') fetchArtists();
      if (collectionName === 'albums') fetchAlbums();
      if (collectionName === 'songs') fetchSongs();
    } catch (error: any) {
      toast.error('Error deleting item: ' + error.message);
    }
  };

  const filteredArtists = artists.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAlbums = albums.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.artist.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSongs = songs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artist.toLowerCase().includes(searchQuery.toLowerCase()));

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4">Access Denied</h1>
          <p className="text-zinc-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 lg:p-8 pb-40 lg:pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-x-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-orange-500" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-white">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-x-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input 
                placeholder="Search everything..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-white rounded-xl"
              />
            </div>
            <Link to="/">
              <Button variant="outline" className="border-zinc-800 text-zinc-400 hover:text-white rounded-xl gap-x-2">
                <ArrowLeft className="w-4 h-4" />
                Back to App
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="rounded-xl gap-x-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-zinc-900 border-zinc-800">
            <TabsTrigger value="dashboard" className="gap-x-2">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="artists" className="gap-x-2">
              <User className="w-4 h-4" />
              Artists
            </TabsTrigger>
            <TabsTrigger value="albums" className="gap-x-2">
              <Disc className="w-4 h-4" />
              Albums
            </TabsTrigger>
            <TabsTrigger value="songs" className="gap-x-2">
              <Music className="w-4 h-4" />
              Songs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Songs</CardTitle>
                  <Music className="w-4 h-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{songs.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Artists</CardTitle>
                  <User className="w-4 h-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{artists.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Albums</CardTitle>
                  <Disc className="w-4 h-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{albums.length}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-x-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest additions to your library.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {songs.slice(0, 5).map(song => (
                    <div key={song.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <div className="flex items-center gap-x-3">
                        <img 
                        src={song.coverUrl || 'https://picsum.photos/seed/song/200/200'} 
                        className="w-10 h-10 rounded object-cover" 
                        referrerPolicy="no-referrer" 
                        alt={song.title}
                      />
                        <div>
                          <p className="font-medium text-sm">{song.title}</p>
                          <p className="text-xs text-zinc-500">{song.artist}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-600 uppercase font-bold">New Song</span>
                    </div>
                  ))}
                  {artists.slice(0, 2).map(artist => (
                    <div key={artist.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <div className="flex items-center gap-x-3">
                      <img 
                        src={artist.imageUrl || 'https://picsum.photos/seed/artist/200/200'} 
                        className="w-10 h-10 rounded-full object-cover" 
                        referrerPolicy="no-referrer" 
                        alt={artist.name}
                      />
                        <div>
                          <p className="font-medium text-sm">{artist.name}</p>
                          <p className="text-xs text-zinc-500">Artist Profile</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-600 uppercase font-bold">New Artist</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="artists">
            <div className="mb-8 space-y-4">
              <h2 className="text-xl font-bold text-white">Existing Artists</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArtists.map(artist => (
                  <div key={artist.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-x-4">
                      <img src={artist.imageUrl || 'https://picsum.photos/seed/artist/200/200'} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <h3 className="font-bold text-white">{artist.name}</h3>
                        <p className="text-xs text-zinc-500 truncate max-w-[200px]">{artist.bio}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-x-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleEditArtist(artist)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity border-zinc-800 text-zinc-400 hover:text-white h-8 w-8"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => handleDelete('artists', artist.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredArtists.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
                    <p className="text-zinc-500">No artists found matching your search.</p>
                  </div>
                )}
              </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardHeader>
                <CardTitle>{editingArtist ? 'Edit Artist' : 'Add New Artist'}</CardTitle>
                <CardDescription>
                  {editingArtist ? `Updating profile for ${editingArtist.name}` : 'Create a new verified artist profile.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingArtist ? handleUpdateArtist : handleAddArtist} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Artist Name</Label>
                    <Input 
                      value={artistName} 
                      onChange={(e) => setArtistName(e.target.value)} 
                      className="bg-zinc-800 border-zinc-700" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Input 
                      value={artistBio} 
                      onChange={(e) => setArtistBio(e.target.value)} 
                      className="bg-zinc-800 border-zinc-700" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Image {editingArtist ? '(Optional - Leave empty to keep current)' : '(JPG, PNG - Max 5MB)'}</Label>
                    <Input 
                      type="file" 
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={(e) => setArtistImage(e.target.files?.[0] || null)} 
                      className="bg-zinc-800 border-zinc-700" 
                    />
                    {editingArtist && !artistImage && editingArtist.imageUrl && (
                      <div className="mt-2">
                        <p className="text-xs text-zinc-500 mb-1">Current Image:</p>
                        <img src={editingArtist.imageUrl} className="w-16 h-16 rounded-full object-cover border border-zinc-700" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-x-3">
                    <Button type="submit" disabled={loading} className="flex-1 bg-orange-500 text-black hover:bg-orange-600">
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingArtist ? 'Update Artist' : 'Add Artist'}
                    </Button>
                    {editingArtist && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setEditingArtist(null);
                          setArtistName('');
                          setArtistBio('');
                          setArtistImage(null);
                        }}
                        className="border-zinc-800 text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="albums">
            <div className="mb-8 space-y-4">
              <h2 className="text-xl font-bold text-white">Existing Albums</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAlbums.map(album => (
                  <div key={album.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-x-4">
                      <img src={album.coverUrl || 'https://picsum.photos/seed/album/200/200'} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <h3 className="font-bold text-white">{album.title}</h3>
                        <p className="text-xs text-zinc-500">{album.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-x-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleEditAlbum(album)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity border-zinc-800 text-zinc-400 hover:text-white h-8 w-8"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => handleDelete('albums', album.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredAlbums.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
                    <p className="text-zinc-500">No albums found matching your search.</p>
                  </div>
                )}
              </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardHeader>
                <CardTitle>{editingAlbum ? 'Edit Album' : 'Add New Album'}</CardTitle>
                <CardDescription>
                  {editingAlbum ? `Updating album ${editingAlbum.title}` : 'Create a new album for an artist.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingAlbum ? handleUpdateAlbum : handleAddAlbum} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Album Title</Label>
                    <Input 
                      value={albumTitle} 
                      onChange={(e) => setAlbumTitle(e.target.value)} 
                      className="bg-zinc-800 border-zinc-700" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Artist</Label>
                    <select 
                      value={albumArtistId} 
                      onChange={(e) => setAlbumArtistId(e.target.value)}
                      className="w-full bg-zinc-800 border-zinc-700 rounded-md p-2 text-white"
                      required
                    >
                      <option value="">Select Artist</option>
                      {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Release Year</Label>
                    <Input 
                      type="number" 
                      value={albumYear} 
                      onChange={(e) => setAlbumYear(parseInt(e.target.value))} 
                      className="bg-zinc-800 border-zinc-700" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Album Cover {editingAlbum ? '(Optional - Leave empty to keep current)' : '(JPG, PNG - Max 5MB)'}</Label>
                    <Input 
                      type="file" 
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={(e) => setAlbumCover(e.target.files?.[0] || null)} 
                      className="bg-zinc-800 border-zinc-700" 
                    />
                    {editingAlbum && !albumCover && editingAlbum.coverUrl && (
                      <div className="mt-2">
                        <p className="text-xs text-zinc-500 mb-1">Current Cover:</p>
                        <img src={editingAlbum.coverUrl} className="w-16 h-16 rounded-lg object-cover border border-zinc-700" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-x-3">
                    <Button type="submit" disabled={loading} className="flex-1 bg-orange-500 text-black hover:bg-orange-600">
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingAlbum ? 'Update Album' : 'Add Album'}
                    </Button>
                    {editingAlbum && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setEditingAlbum(null);
                          setAlbumTitle('');
                          setAlbumCover(null);
                        }}
                        className="border-zinc-800 text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="songs">
            <div className="mb-8 space-y-4">
              <h2 className="text-xl font-bold text-white">Existing Songs</h2>
              <div className="space-y-2">
                {filteredSongs.map(song => (
                  <div key={song.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-x-4">
                      <img src={song.coverUrl || 'https://picsum.photos/seed/song/200/200'} className="w-10 h-10 rounded object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <h3 className="font-bold text-white text-sm">{song.title}</h3>
                        <p className="text-xs text-zinc-500">{song.artist} • {song.album || 'Single'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-x-2">
                      <a href={song.audioUrl} target="_blank" rel="noreferrer" className="p-2 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleEditSong(song)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity border-zinc-800 text-zinc-400 hover:text-white h-8 w-8"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => handleDelete('songs', song.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredSongs.length === 0 && (
                  <div className="py-12 text-center bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
                    <p className="text-zinc-500">No songs found matching your search.</p>
                  </div>
                )}
              </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardHeader>
                <CardTitle>{editingSong ? 'Edit Song' : 'Add New Song'}</CardTitle>
                <CardDescription>
                  {editingSong ? `Updating song ${editingSong.title}` : 'Upload a new track to the system.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingSong ? handleUpdateSong : handleAddSong} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Song Title</Label>
                    <Input 
                      value={songTitle} 
                      onChange={(e) => setSongTitle(e.target.value)} 
                      className="bg-zinc-800 border-zinc-700" 
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Artist</Label>
                      <select 
                        value={songArtistId} 
                        onChange={(e) => setSongArtistId(e.target.value)}
                        className="w-full bg-zinc-800 border-zinc-700 rounded-md p-2 text-white"
                        required
                      >
                        <option value="">Select Artist</option>
                        {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Album (Optional)</Label>
                      <select 
                        value={songAlbumId} 
                        onChange={(e) => setSongAlbumId(e.target.value)}
                        className="w-full bg-zinc-800 border-zinc-700 rounded-md p-2 text-white"
                      >
                        <option value="">No Album</option>
                        {albums.filter(a => a.artistId === songArtistId).map(a => (
                          <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Genre</Label>
                    <Input 
                      value={songGenre} 
                      onChange={(e) => setSongGenre(e.target.value)} 
                      className="bg-zinc-800 border-zinc-700" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Audio File {editingSong ? '(Optional - Leave empty to keep current)' : '(MP3, WAV - Max 20MB)'}</Label>
                    <Input 
                      type="file" 
                      accept="audio/mpeg,audio/wav,audio/mp3"
                      onChange={(e) => setSongAudio(e.target.files?.[0] || null)} 
                      className="bg-zinc-800 border-zinc-700" 
                      required={!editingSong}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Cover {editingSong ? '(Optional - Leave empty to keep current)' : '(Optional - Max 5MB)'}</Label>
                    <Input 
                      type="file" 
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={(e) => setSongCover(e.target.files?.[0] || null)} 
                      className="bg-zinc-800 border-zinc-700" 
                    />
                    {editingSong && !songCover && editingSong.coverUrl && (
                      <div className="mt-2">
                        <p className="text-xs text-zinc-500 mb-1">Current Cover:</p>
                        <img src={editingSong.coverUrl} className="w-16 h-16 rounded object-cover border border-zinc-700" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-x-3">
                    <Button type="submit" disabled={loading} className="flex-1 bg-orange-500 text-black hover:bg-orange-600">
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingSong ? 'Update Song' : 'Add Song'}
                    </Button>
                    {editingSong && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setEditingSong(null);
                          setSongTitle('');
                          setSongAudio(null);
                          setSongCover(null);
                        }}
                        className="border-zinc-800 text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Debug Console for Mobile */}
        <div className="mt-20 p-4 bg-black border border-zinc-800 rounded-xl">
          <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            System Debug Log (Mobile)
          </h3>
          <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-[10px]">
            {debugLogs.length === 0 && <p className="text-zinc-700 italic">No logs yet. Try adding an artist...</p>}
            {debugLogs.map((log, i) => (
              <div key={i} className={`p-1 rounded ${log.startsWith('ERROR') ? 'bg-red-500/10 text-red-400' : 'text-zinc-400'}`}>
                {log}
              </div>
            ))}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDebugLogs([])}
            className="mt-2 text-[10px] h-6 text-zinc-500 hover:text-white"
          >
            Clear Logs
          </Button>
        </div>
      </div>
    </div>
  );
}
