import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SocketProvider } from "./context/SocketContext";
import { ConfirmProvider } from "./context/ConfirmContext";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import MoodTracker from "./pages/MoodTracker";
import Journal from "./pages/Journal";
import Breathing from "./pages/Breathing";
import Insights from "./pages/Insights";
import Memories from "./pages/Memories";
import Profile from "./pages/Profile";
import UserList from "./pages/UserList";
import FriendsList from "./pages/FriendsList";
import FriendRequests from "./pages/FriendRequests";
import Chat from "./pages/Chat";

import AdminPanel from "./pages/AdminPanel";
import ManageUsers from "./pages/admin/ManageUsers";
import ViewJournals from "./pages/admin/ViewJournals";
import SystemInsights from "./pages/admin/SystemInsights";
import AuditLog from "./pages/admin/AuditLog";

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <ThemeProvider>
        <ConfirmProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                borderRadius: "12px",
                background: "rgba(15,22,24,0.92)",
                color: "#fff",
                fontSize: "14px",
                padding: "10px 14px",
              },
            }}
          />

          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected — wrapped in the app shell (nav + content) */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/mood" element={<MoodTracker />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/breathing" element={<Breathing />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/memories" element={<Memories />} />
              <Route path="/users" element={<UserList />} />
              <Route path="/friends" element={<FriendsList />} />
              <Route path="/friends/requests" element={<FriendRequests />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Admin */}
            <Route
              element={
                <ProtectedRoute role="admin">
                  <AppLayout admin />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/journals" element={<ViewJournals />} />
              <Route path="/admin/insights" element={<SystemInsights />} />
              <Route path="/admin/audit" element={<AuditLog />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </ConfirmProvider>
      </ThemeProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
