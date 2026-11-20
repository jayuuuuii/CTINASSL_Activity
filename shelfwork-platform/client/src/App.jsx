import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Loading from './components/Loading.jsx';
import Redirect from './components/Redirect.jsx';
import useHashRoute from './hooks/useHashRoute.js';
import { useAuth } from './context/AuthContext.jsx';

import Home from './pages/shop/Home.jsx';
import Shop from './pages/shop/Shop.jsx';
import ProductPage from './pages/shop/ProductPage.jsx';
import CategoriesPage from './pages/shop/CategoriesPage.jsx';
import CartPage from './pages/shop/CartPage.jsx';
import CheckoutPage from './pages/shop/CheckoutPage.jsx';
import AccountPage from './pages/shop/AccountPage.jsx';
import OrderPage from './pages/shop/OrderPage.jsx';
import LoginPage from './pages/shop/LoginPage.jsx';
import RegisterPage from './pages/shop/RegisterPage.jsx';
import About from './pages/shop/About.jsx';
import NotFound from './pages/shop/NotFound.jsx';

import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminCategories from './pages/admin/AdminCategories.jsx';
import AdminSuppliers from './pages/admin/AdminSuppliers.jsx';
import AdminStock from './pages/admin/AdminStock.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminOrderDetail from './pages/admin/AdminOrderDetail.jsx';
import AdminCustomers from './pages/admin/AdminCustomers.jsx';
import AdminCustomerDetail from './pages/admin/AdminCustomerDetail.jsx';
import AdminTransactions from './pages/admin/AdminTransactions.jsx';

/** Sends guests to the login page and comes back afterwards. */
function RequireCustomer({ next, children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Redirect to={`login?next=${next}`} />;
  if (isAdmin)
    return (
      <div className="container section">
        <p className="notice">You are signed in as an administrator. Log out and use a customer account to shop. <a href="#/admin">Go to the admin panel</a></p>
      </div>
    );
  return children;
}

function AdminApp({ segments, params }) {
  const { isAdmin } = useAuth();
  const [, page, id] = segments;
  if (isAdmin && page === 'login') return <Redirect to="admin" />;
  if (!isAdmin) return <AdminLogin />;
  switch (page) {
    case undefined:
      return <AdminDashboard />;
    case 'products':
      return <AdminProducts params={params} key={params.toString()} />;
    case 'categories':
      return <AdminCategories />;
    case 'suppliers':
      return <AdminSuppliers />;
    case 'stock':
      return <AdminStock params={params} />;
    case 'orders':
      return id ? <AdminOrderDetail orderId={id} key={id} /> : <AdminOrders params={params} key={params.toString()} />;
    case 'customers':
      return id ? <AdminCustomerDetail userId={id} key={id} /> : <AdminCustomers />;
    case 'transactions':
      return <AdminTransactions params={params} key={params.toString()} />;
    default:
      return <AdminDashboard />;
  }
}

function ShopPage({ segments, params }) {
  const [page = 'home', id] = segments;
  switch (page) {
    case 'home':
      return <Home />;
    case 'shop':
      return <Shop params={params} />;
    case 'product':
      return <ProductPage productId={id} key={id} />;
    case 'categories':
      return <CategoriesPage />;
    case 'cart':
      return <CartPage />;
    case 'checkout':
      return <RequireCustomer next="checkout"><CheckoutPage /></RequireCustomer>;
    case 'account':
      return <RequireCustomer next="account"><AccountPage /></RequireCustomer>;
    case 'orders':
      return id ? <RequireCustomer next={`orders/${id}`}><OrderPage orderId={id} justPlaced={params.get('placed') === '1'} key={id} /></RequireCustomer> : <Redirect to="account" />;
    case 'login':
      return <LoginPage params={params} />;
    case 'register':
      return <RegisterPage params={params} />;
    case 'about':
      return <About />;
    default:
      return <NotFound />;
  }
}

export default function App() {
  const { segments, params } = useHashRoute();
  const { ready } = useAuth();

  if (!ready) return <div className="boot"><Loading label="Opening the shop…" /></div>;

  if (segments[0] === 'admin') return <AdminApp segments={segments} params={params} />;

  return (
    <div className="app">
      <Header section={segments[0] || 'home'} />
      <main>
        <ShopPage segments={segments} params={params} />
      </main>
      <Footer />
    </div>
  );
}
