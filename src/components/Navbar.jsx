import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function Navbar() {
  const { language, toggleLanguage } = useLanguage();

  const [username, setUsername] = useState(
    localStorage.getItem("username") || "Guest",
  );

  const [role, setRole] = useState(localStorage.getItem("user_role") || "");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    localStorage.removeItem("user_role");
    localStorage.removeItem("filename");

    setUsername("Guest");
    setRole("");

    window.location.href = "/login";
  };

  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom px-4 py-3">
      <div className="container-fluid">
        {/* Logo / Title */}
        <div>
          <h5 className="mb-0">Legal Copilot</h5>
        </div>

        {/* Right Section */}
        <div className="d-flex align-items-center gap-3">
          {/* Language Button */}
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={toggleLanguage}
          >
            {language === "en" ? "العربية" : "English"}
          </button>

          {/* User Info */}
          <div className="text-end">
            <div>
              <strong>{username}</strong>
            </div>

            {role && (
              <small className="text-muted">
                {language === "en" ? `Role: ${role}` : `الدور: ${role}`}
              </small>
            )}
          </div>

          {/* Logout */}
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={handleLogout}
          >
            {language === "en" ? "Logout" : "تسجيل الخروج"}
          </button>
        </div>
      </div>
    </nav>
  );
}
