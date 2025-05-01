
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import HomePage from './pages/HomePage'
import ListingPage from './pages/ListingPage'
import CreateListingPage from './pages/CreateListingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFound from './pages/NotFound'
import ProfilePage from './pages/ProfilePage'
import MessagesPage from './pages/MessagesPage'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from './components/ui/sonner'
import LostFoundPage from './pages/LostFoundPage'
import LostFoundDetailsPage from './pages/LostFoundDetailsPage'
import CreateLostFoundPage from './pages/CreateLostFoundPage'
import FriendsPage from './pages/FriendsPage'
import PostsPage from './pages/PostsPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/listings/:id" element={<ListingPage />} />
            <Route path="/create-listing" element={<CreateListingPage />} />
            <Route path="/lost-found" element={<LostFoundPage />} />
            <Route path="/lost-found/create" element={<CreateLostFoundPage />} />
            <Route path="/lost-found/:id" element={<LostFoundDetailsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
