import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ScrollToHash from "./components/ScrollToHash";

const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const DownloadPage = lazy(() => import("./pages/DownloadPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const ChangelogPage = lazy(() => import("./pages/ChangelogPage"));

// Docs pages
const DocsLayout = lazy(() => import("./pages/docs/DocsLayout"));
const DocsIndexPage = lazy(() => import("./pages/docs/DocsIndexPage"));
const QuickStartPage = lazy(() => import("./pages/docs/QuickStartPage"));
const InterfacePage = lazy(() => import("./pages/docs/InterfacePage"));
const FirstProjectPage = lazy(() => import("./pages/docs/FirstProjectPage"));
const PartsPage = lazy(() => import("./pages/docs/PartsPage"));
const StockPage = lazy(() => import("./pages/docs/StockPage"));
const GroupsPage = lazy(() => import("./pages/docs/GroupsPage"));
const CutListsPage = lazy(() => import("./pages/docs/CutListsPage"));
const AssembliesPage = lazy(() => import("./pages/docs/AssembliesPage"));
const TemplatesPage = lazy(() => import("./pages/docs/TemplatesPage"));
const SnappingPage = lazy(() => import("./pages/docs/SnappingPage"));
const JoineryPage = lazy(() => import("./pages/docs/JoineryPage"));
const ShortcutsPage = lazy(() => import("./pages/docs/ShortcutsPage"));
const SettingsPage = lazy(() => import("./pages/docs/SettingsPage"));
const RequirementsPage = lazy(() => import("./pages/docs/RequirementsPage"));
const TroubleshootingPage = lazy(
  () => import("./pages/docs/TroubleshootingPage"),
);
const FaqPage = lazy(() => import("./pages/docs/FaqPage"));

function App() {
  return (
    <Router>
      <ScrollToHash />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/docs" element={<DocsLayout />}>
            <Route index element={<DocsIndexPage />} />
            <Route path="quick-start" element={<QuickStartPage />} />
            <Route path="interface" element={<InterfacePage />} />
            <Route path="first-project" element={<FirstProjectPage />} />
            <Route path="parts" element={<PartsPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="groups" element={<GroupsPage />} />
            <Route path="cut-lists" element={<CutListsPage />} />
            <Route path="assemblies" element={<AssembliesPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="snapping" element={<SnappingPage />} />
            <Route path="joinery" element={<JoineryPage />} />
            <Route path="shortcuts" element={<ShortcutsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="requirements" element={<RequirementsPage />} />
            <Route path="troubleshooting" element={<TroubleshootingPage />} />
            <Route path="faq" element={<FaqPage />} />
          </Route>
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Analytics />
      <SpeedInsights />
    </Router>
  );
}

export default App;
