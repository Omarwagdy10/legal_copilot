import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const API_URL = "http://127.0.0.1:8000";

const auth = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export default function DashboardHome() {
  const { t, language } = useLanguage();

  const [documents, setDocuments] = useState([]);
  const [pending, setPending] = useState(0);
  const [risks, setRisks] = useState(0);
  const [loading, setLoading] = useState(true);

  // Popup instead of showing technical errors inside the page.
  const [popup, setPopup] = useState({
    show: false,
    type: "info",
    message: "",
  });

  const isArabic = language === "ar";
  const tr = (en, ar) => (isArabic ? ar : en);

  const showPopup = (message, type = "info") => {
    setPopup({ show: true, type, message });
  };

  const closePopup = () => {
    setPopup({ show: false, type: "info", message: "" });
  };

  // Make the whole application follow the selected language direction.
  useEffect(() => {
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.documentElement.lang = isArabic ? "ar" : "en";
  }, [isArabic]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);

        const [documentsResponse, pendingResponse, risksResponse] =
          await Promise.all([
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

        const responses = [documentsResponse, pendingResponse, risksResponse];

        if (responses.some((response) => response.status === 401)) {
          localStorage.clear();

          if (!cancelled) {
            showPopup(
              tr(
                "Your session has expired. Please login again.",
                "انتهت صلاحية الجلسة. من فضلك قم بتسجيل الدخول مرة أخرى.",
              ),
              "error",
            );
          }
          return;
        }

        const documentsData = await documentsResponse.json();
        const pendingData = await pendingResponse.json();
        const risksData = await risksResponse.json();

        if (!documentsResponse.ok) {
          throw new Error(
            documentsData.detail ||
              documentsData.message ||
              tr("Unable to load documents.", "تعذر تحميل المستندات."),
          );
        }

        if (!pendingResponse.ok) {
          throw new Error(
            pendingData.detail ||
              pendingData.message ||
              tr(
                "Unable to load pending approvals.",
                "تعذر تحميل الموافقات المعلقة.",
              ),
          );
        }

        if (!risksResponse.ok) {
          throw new Error(
            risksData.detail ||
              risksData.message ||
              tr("Unable to load risk issues.", "تعذر تحميل مشكلات المخاطر."),
          );
        }

        if (!cancelled) {
          setDocuments(documentsData.documents || []);
          setPending(pendingData.count || 0);
          setRisks(risksData.count || 0);
        }
      } catch (error) {
        if (!cancelled) {
          showPopup(
            error?.message ||
              tr(
                "Unable to load dashboard data. Please make sure the backend is running.",
                "تعذر تحميل بيانات لوحة التحكم. تأكد من تشغيل الـ backend.",
              ),
            "error",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const getStatusLabel = (status) => {
    if (!isArabic) return status;

    const labels = {
      uploaded: "تم الرفع",
      indexed: "تمت الفهرسة",
      reviewed: "تمت المراجعة",
      approved: "تمت الموافقة",
      rejected: "مرفوض",
      failed: "فشل",
    };

    return labels[status] || status;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "reviewed":
      case "approved":
        return "bg-success";
      case "rejected":
      case "failed":
        return "bg-danger";
      case "indexed":
        return "bg-primary";
      case "uploaded":
      default:
        return "bg-warning text-dark";
    }
  };

  return (
    <>
      {/* ================= Popup ================= */}
      {popup.show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            zIndex: 3000,
            direction: isArabic ? "rtl" : "ltr",
          }}
        >
          <div
            className="bg-white rounded-4 shadow p-4"
            style={{
              width: "min(92%, 460px)",
              textAlign: isArabic ? "right" : "left",
            }}
          >
            <div
              className={`alert ${
                popup.type === "error" ? "alert-danger" : "alert-info"
              } mb-3`}
            >
              <strong>
                {popup.type === "error"
                  ? tr("Error", "خطأ")
                  : tr("Information", "معلومة")}
              </strong>
            </div>

            <p className="mb-4" style={{ lineHeight: "1.8" }}>
              {popup.message}
            </p>

            <div className={isArabic ? "text-start" : "text-end"}>
              <button
                type="button"
                className="btn btn-primary px-4"
                onClick={closePopup}
              >
                {tr("OK", "حسنًا")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= Dashboard ================= */}
      <div
        className="dashboard"
        dir={isArabic ? "rtl" : "ltr"}
        style={{
          direction: isArabic ? "rtl" : "ltr",
          textAlign: isArabic ? "right" : "left",
        }}
      >
        {/* Welcome */}
        <div className="welcome">
          <h2>{t("welcome")}</h2>
          <p>{t("reviewContracts")}</p>
        </div>

        {/* Statistics */}
        <div className="row g-4 mt-2">
          <div className="col-md-4">
            <div className="stat-card">
              <span className="stat-icon">📄</span>
              <div>
                <h3>{loading ? "..." : documents.length}</h3>
                <p>{t("documents")}</p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="stat-card">
              <span className="stat-icon">⚠️</span>
              <div>
                <h3>{loading ? "..." : risks}</h3>
                <p>{tr("Risk Issues", "مشكلات المخاطر")}</p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="stat-card">
              <span className="stat-icon">⏳</span>
              <div>
                <h3>{loading ? "..." : pending}</h3>
                <p>{tr("Pending Approvals", "الموافقات المعلقة")}</p>
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
                <h5>{tr("Recent Contracts", "أحدث العقود")}</h5>

                <Link
                  className="btn btn-sm btn-outline-primary"
                  to="/documents"
                >
                  {tr("View All", "عرض الكل")}
                </Link>
              </div>

              {documents.slice(0, 5).map((d) => (
                <div className="contract-item" key={d.id}>
                  <div>
                    <strong>{d.original_filename}</strong>
                    <small>
                      {tr("Status:", "الحالة:")} {getStatusLabel(d.status)}
                    </small>
                  </div>

                  <span className={`badge ${getStatusClass(d.status)}`}>
                    {getStatusLabel(d.status)}
                  </span>
                </div>
              ))}

              {!loading && !documents.length && (
                <p className="mt-3">
                  {tr(
                    "No documents uploaded yet.",
                    "لم يتم رفع أي مستندات حتى الآن.",
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-lg-4">
            <div className="content-card">
              <h5>{tr("Quick Actions", "إجراءات سريعة")}</h5>

              <Link
                className="quick-action d-block text-decoration-none"
                to="/documents"
              >
                📤 {tr("Upload Contract", "رفع عقد")}
              </Link>

              <Link
                className="quick-action d-block text-decoration-none"
                to="/ask"
              >
                🤖 {tr("Ask Copilot", "اسأل المساعد")}
              </Link>

              <Link
                className="quick-action d-block text-decoration-none"
                to="/documents"
              >
                ⚙️ {tr("Start Review", "بدء المراجعة")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
