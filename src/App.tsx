import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ModeToggle } from "./components/ModeToggle";
import { AssistantView } from "./features/assistant/AssistantView";
import { AppShell } from "./layout/AppShell";
import { LocationProvider } from "./location/LocationContext";
import { MetaProvider } from "./meta/MetaContext";
import { CategoriesPage } from "./routes/menu/CategoriesPage";
import { ItemCreatePage } from "./routes/menu/ItemCreatePage";
import { ItemDetailPage } from "./routes/menu/ItemDetailPage";
import { ItemsListPage } from "./routes/menu/ItemsListPage";
import { ModifierGroupsPage } from "./routes/menu/ModifierGroupsPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { ActivityPage } from "./routes/reports/ActivityPage";
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
            <Route path="activity" element={<ActivityPage />} />
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
    <AuthProvider>
      <MetaProvider>
        <SettingsProvider>
          <Surface />
        </SettingsProvider>
      </MetaProvider>
    </AuthProvider>
  );
}
