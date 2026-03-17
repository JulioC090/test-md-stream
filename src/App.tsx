import { Outlet, Link, useLocation } from "react-router-dom";

function App() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className="app">
      <header className="header">
        <h1>
          <Link to="/" className="header-link">
            Streamdown Benchmark Suite
          </Link>
        </h1>
        {!isHome && (
          <nav className="nav-links">
            <Link
              to="/standard"
              className={pathname === "/standard" ? "nav-active" : ""}
            >
              Standard
            </Link>
            <Link
              to="/block"
              className={pathname === "/block" ? "nav-active" : ""}
            >
              Block
            </Link>
            <Link
              to="/virtualized"
              className={pathname === "/virtualized" ? "nav-active" : ""}
            >
              Virtualized
            </Link>
          </nav>
        )}
      </header>
      <Outlet />
    </div>
  );
}

export default App;
