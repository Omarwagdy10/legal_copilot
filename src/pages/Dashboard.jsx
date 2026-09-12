import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const API_URL = "http://127.0.0.1:8000";

const auth = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export default function Dashboard() {
  const { t, language } = useLanguage();

  const [documents, setDocuments] = useState([]);
  const [pending, setPending] = useState(0);
  const [risks, setRisks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [a, b, c] = await Promise.all([
          fetch(`${API_URL}/documents`, {
            headers: auth(),
          }),

          fetch(`${API_URL}/documents/pending-approvals`, {
            headers: auth(),
          }),

          fetch(`${API_URL}/documents/risk-issues`, {
            headers: auth(),
          }),
        ]);

        if ([a, b, c].some((r) => r.status === 401)) {
          localStorage.clear();

          setMessage(
            language === "ar"
              ? "انتهت صلاحية الجلسة. من فضلك قم بتسجيل الدخول مرة أخرى."
              : "Your session has expired. Please login again.",
          );

          return;
        }

        const documentsData = await a.json();
        const pendingData = await b.json();
        const risksData = await c.json();

        setDocuments(documentsData.documents || []);
        setPending(pendingData.count || 0);
        setRisks(risksData.count || 0);
      } catch {
        setMessage(
          language === "ar"
            ? "تعذر تحميل بيانات لوحة التحكم. تأكد من تشغيل الـ backend."
            : "Unable to load dashboard data. Please make sure the backend is running.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [language]);

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="welcome">
        <h2>{t("welcome")}</h2>

        <p>{t("reviewContracts")}</p>
      </div>

      {/* Error Message */}
      {message && <div className="alert alert-danger">{message}</div>}

      {/* Statistics */}
      <div className="row g-4 mt-2">
        {/* Documents */}
        <div className="col-md-4">
          <div className="stat-card">
            <span className="stat-icon">📄</span>

            <div>
              <h3>{loading ? "..." : documents.length}</h3>

              <p>{t("documents")}</p>
            </div>
          </div>
        </div>

        {/* Risk Issues */}
        <div className="col-md-4">
          <div className="stat-card">
            <span className="stat-icon">⚠️</span>

            <div>
              <h3>{loading ? "..." : risks}</h3>

              <p>{language === "ar" ? "مشكلات المخاطر" : "Risk Issues"}</p>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="col-md-4">
          <div className="stat-card">
            <span className="stat-icon">⏳</span>

            <div>
              <h3>{loading ? "..." : pending}</h3>

              <p>
                {language === "ar" ? "الموافقات المعلقة" : "Pending Approvals"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="row g-4 mt-2">
        {/* Recent Contracts */}
        <div className="col-lg-8">
          <div className="content-card">
            <div className="card-header">
              <h5>{language === "ar" ? "أحدث العقود" : "Recent Contracts"}</h5>

              <Link className="btn btn-sm btn-outline-primary" to="/documents">
                {language === "ar" ? "عرض الكل" : "View All"}
              </Link>
            </div>

            {documents.slice(0, 5).map((d) => (
              <div className="contract-item" key={d.id}>
                <div>
                  <strong>{d.original_filename}</strong>

                  <small>
                    {language === "ar"
                      ? `الحالة: ${d.status}`
                      : `Status: ${d.status}`}
                  </small>
                </div>

                <span
                  className={`badge ${
                    d.status === "reviewed" || d.status === "approved"
                      ? "bg-success"
                      : d.status === "rejected"
                        ? "bg-danger"
                        : d.status === "indexed"
                          ? "bg-primary"
                          : "bg-warning text-dark"
                  }`}
                >
                  {d.status}
                </span>
              </div>
            ))}

            {/* No Documents */}
            {!loading && !documents.length && (
              <p className="mt-3">
                {language === "ar"
                  ? "لم يتم رفع أي مستندات حتى الآن."
                  : "No documents uploaded yet."}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-lg-4">
          <div className="content-card">
            <h5>{language === "ar" ? "إجراءات سريعة" : "Quick Actions"}</h5>

            <Link
              className="quick-action d-block text-decoration-none"
              to="/documents"
            >
              📤 {language === "ar" ? "رفع عقد" : "Upload Contract"}
            </Link>

            <Link
              className="quick-action d-block text-decoration-none"
              to="/ask"
            >
              🤖 {language === "ar" ? "اسأل المساعد" : "Ask Copilot"}
            </Link>

            <Link
              className="quick-action d-block text-decoration-none"
              to="/documents"
            >
              ⚙️ {language === "ar" ? "بدء المراجعة" : "Start Review"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
