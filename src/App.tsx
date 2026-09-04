import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ModeToggle } from "./components/ModeToggle";
import { AssistantView } from "./features/assistant/AssistantView";
import { AppShell } from "./layout/AppShell";
import { LocationProvider } from "./location/LocationContext";
import { RepositoryProvider } from "./repositories/RepositoryContext";
import { CategoriesPage } from "./routes/catalog/CategoriesPage";
import { ItemCreatePage } from "./routes/catalog/ItemCreatePage";
import { ItemDetailPage } from "./routes/catalog/ItemDetailPage";
import { ItemsListPage } from "./routes/catalog/ItemsListPage";
import { ModifierGroupsPage } from "./routes/catalog/ModifierGroupsPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { AnalyticsPage } from "./routes/reports/AnalyticsPage";
import { OrderHistoryPage } from "./routes/reports/OrderHistoryPage";
import { ReportingPage } from "./routes/reports/ReportingPage";
import { PricingPage } from "./routes/pricing/PricingPage";
import { SettingsProvider, useSettings } from "./settings/SettingsContext";

function ConsoleApp() {
  return (
    <BrowserRouter>
      <LocationProvider>
        <Routes>
          <Route element={<AppShell modeToggle={<ModeToggle />} />}>
            <Route index element={<Navigate to="/items" replace />} />
            <Route path="items" element={<ItemsListPage />} />
            <Route path="items/new" element={<ItemCreatePage />} />
            <Route path="items/:itemId" element={<ItemDetailPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="modifier-groups" element={<ModifierGroupsPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="reporting" element={<ReportingPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="orders" element={<OrderHistoryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </LocationProvider>
    </BrowserRouter>
  );
}

function Surface() {
  const { mode } = useSettings();
  return mode === "assistant" ? <AssistantView /> : <ConsoleApp />;
}

export default function App() {
  return (
    <RepositoryProvider>
      <AuthProvider>
        <SettingsProvider>
          <Surface />
        </SettingsProvider>
      </AuthProvider>
    </RepositoryProvider>
  );
}
