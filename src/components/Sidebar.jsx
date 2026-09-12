import { NavLink } from 'react-router-dom';
export default function Sidebar(){return <aside className="sidebar"><div className="sidebar-logo"><span>⚖️</span><h4>Legal Copilot</h4></div><nav className="sidebar-nav">
<NavLink to="/" className="nav-link"><span>🏠</span>Dashboard</NavLink>
<NavLink to="/documents" className="nav-link"><span>📄</span>Documents</NavLink>
<NavLink to="/ask" className="nav-link"><span>🤖</span>Ask Copilot</NavLink>
<NavLink to="/deviation" className="nav-link"><span>🔍</span>Deviation</NavLink>
</nav></aside>}
