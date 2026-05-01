// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import * as Sentry from "@sentry/react";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ResultsPage from "./pages/ResultsPage";

function AppContent() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "12px",
            padding: "12px 16px",
          },
        }}
      />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-4">We've been notified and are looking into it.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Reload Page
            </button>
          </div>
        </div>
      }
      showDialog
    >
      <AppContent />
    </Sentry.ErrorBoundary>
  );
}
