import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { TicketDetails } from './pages/TicketDetails';
import { CreateListing } from './pages/CreateListing';
import { EditListing } from './pages/EditListing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ChatThreadPage } from './pages/ChatThreadPage';
import { StaticPage } from './pages/StaticPage';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="explore" element={<Explore />} />
          <Route path="tickets/:id" element={<TicketDetails />} />
          <Route
            path="listings/:id/edit"
            element={
              <ProtectedRoute>
                <EditListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="listings/new"
            element={
              <ProtectedRoute>
                <CreateListing />
              </ProtectedRoute>
            }
          />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="chat/:id"
            element={
              <ProtectedRoute>
                <ChatThreadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="about"
            element={
              <StaticPage title="About PlanBDeal">
                <p>
                  PlanBDeal is a peer-to-peer marketplace that helps moviegoers connect over unused tickets. We built
                  this project to demonstrate a full-stack application with secure authentication, concurrency-safe
                  inventory handling, and real-time chat and voice calling.
                </p>
              </StaticPage>
            }
          />
          <Route
            path="help"
            element={
              <StaticPage title="Help">
                <p>Browse tickets from the Explore page, or list one you can&apos;t use from "List a Ticket".</p>
                <p>Once a seller accepts your request, a chat and voice-call option unlock for that listing.</p>
                <p>PlanBDeal never processes payments or verifies ticket transfers — always use your provider&apos;s permitted transfer method.</p>
              </StaticPage>
            }
          />
          <Route
            path="contact"
            element={
              <StaticPage title="Contact">
                <p>This is a demo project. For questions about the codebase, see the project README.</p>
              </StaticPage>
            }
          />
          <Route
            path="terms"
            element={
              <StaticPage title="Terms">
                <p>
                  PlanBDeal is a demo application. It does not process payments and does not guarantee or verify
                  ticket transfers. Users are responsible for complying with their ticket provider&apos;s terms.
                </p>
              </StaticPage>
            }
          />
          <Route
            path="privacy"
            element={
              <StaticPage title="Privacy">
                <p>
                  Account data (name, email, password hash) is stored to operate the service. Listings, requests,
                  and chat messages are visible only to the relevant parties. No booking QR codes or payment card
                  details are ever collected.
                </p>
              </StaticPage>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
