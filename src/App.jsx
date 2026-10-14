import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { CustomerProvider } from './context/CustomerContext';
import ErrorBoundary from './components/ErrorBoundary';
import SiteLayout from './components/SiteLayout';
import Home from './pages/Home';
import MyData from './pages/MyData';
import PaymentMethods from './pages/PaymentMethods';

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <ToastProvider>
        <CustomerProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<Home />} />
              <Route path="payment" element={<PaymentMethods />} />
              <Route path="me" element={<MyData />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </CustomerProvider>
      </ToastProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
