import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const API_URL = "http://127.0.0.1:8000";

const token = () => localStorage.getItem("access_token");

const buttonStyles = {
  select: {
    background: "#eef2f7",
    color: "#334155",
    border: "1px solid #d9e0e8",
  },
  delete: {
    background: "#fff1f2",
    color: "#b42318",
    border: "1px solid #fecdd3",
  },
  retry: {
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #dbe2ea",
  },
  review: {
    background: "#edf7f2",
    color: "#356859",
    border: "1px solid #d6ebe1",
  },
  view: {
    background: "#f0f4fa",
    color: "#496581",
    border: "1px solid #d9e2ed",
  },
  deviation: {
    background: "#f3f1f8",
    color: "#655d78",
    border: "1px solid #e0ddea",
  },
  reject: {
    background: "#f8f1f1",
    color: "#7a5050",
    border: "1px solid #eadada",
  },
};

function ActionButton({ children, style, onClick, disabled }) {
  return (
    <button
      type="button"
      className="btn btn-sm"
      style={style}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default function Documents() {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const tr = (en, ar) => (isArabic ? ar : en);

  useEffect(() => {
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.documentElement.lang = isArabic ? "ar" : "en";
  }, [isArabic]);

  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [documents, setDocuments] = useState([]);
  const [review, setReview] = useState(null);
  const [deviation, setDeviation] = useState(null);
  const [activeView, setActiveView] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [processType, setProcessType] = useState("");
  const [popup, setPopup] = useState({
    open: false,
    title: "",
    message: "",
    type: "info",
  });

  const getUserFriendlyMessage = (value) => {
    if (!value) return "";

    const message = String(value);
    const msg = message.toLowerCase();

    if (msg.includes("clause extractor")) {
      return tr(
        "We couldn't extract the contract clauses. Please check the PDF and try again.",
        "تعذر استخراج بنود العقد. من فضلك تأكد من ملف الـ PDF وحاول مرة أخرى.",
      );
    }

    if (msg.includes("memo drafter")) {
      return tr(
        "We couldn't generate the legal review report. Please try again.",
        "تعذر إنشاء تقرير المراجعة القانونية. من فضلك حاول مرة أخرى.",
      );
    }

    if (msg.includes("risk assessor")) {
      return tr(
        "We couldn't analyze the risks in this contract. Please try again.",
        "تعذر تحليل مخاطر هذا العقد. من فضلك حاول مرة أخرى.",
      );
    }

    if (
      msg.includes("quota") ||
      msg.includes("resource_exhausted") ||
      msg.includes("rate limit")
    ) {
      return tr(
        "The AI service is temporarily unavailable because its usage limit has been reached. Please try again later.",
        "خدمة الذكاء الاصطناعي غير متاحة مؤقتًا بسبب الوصول إلى حد الاستخدام. من فضلك حاول لاحقًا.",
      );
    }

    if (msg.includes("connection") || msg.includes("connect to the server")) {
      return tr(
        "We couldn't connect to the server. Please make sure the backend is running and try again.",
        "تعذر الاتصال بالخادم. تأكد من تشغيل الـ backend وحاول مرة أخرى.",
      );
    }

    if (msg.includes("not authenticated") || msg.includes("401")) {
      return tr(
        "Your session has expired. Please log in again.",
        "انتهت صلاحية الجلسة. من فضلك سجّل الدخول مرة أخرى.",
      );
    }

    if (msg.includes("permission") || msg.includes("403")) {
      return tr(
        "You don't have permission to perform this action.",
        "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
      );
    }

    if (msg.includes("no saved review")) {
      return tr(
        "No saved review is available for this document yet. Please run Review Contract first.",
        "لا توجد مراجعة محفوظة لهذا المستند حتى الآن. من فضلك شغّل مراجعة العقد أولًا.",
      );
    }

    if (msg.includes("no saved deviation")) {
      return tr(
        "No saved deviation analysis is available for this document yet. Please run Analyze Deviation first.",
        "لا يوجد تحليل انحراف محفوظ لهذا المستند حتى الآن. من فضلك شغّل تحليل الانحراف أولًا.",
      );
    }

    if (msg.startsWith("review failed")) {
      return tr(
        "We couldn't complete the contract review. Please try again.",
        "تعذر إكمال مراجعة العقد. من فضلك حاول مرة أخرى.",
      );
    }

    if (msg.startsWith("deviation failed")) {
      return tr(
        "We couldn't complete the deviation analysis. Please try again.",
        "تعذر إكمال تحليل الانحراف. من فضلك حاول مرة أخرى.",
      );
    }

    if (msg.includes("delete") && msg.includes("403")) {
      return tr(
        "You do not have permission to delete this document.",
        "ليس لديك صلاحية لحذف هذا المستند.",
      );
    }

    if (msg.includes("document uploaded successfully")) {
      return tr("Document uploaded successfully.", "تم رفع المستند بنجاح.");
    }

    if (msg.includes("document deleted successfully")) {
      return tr("Document deleted successfully.", "تم حذف المستند بنجاح.");
    }

    if (msg.includes("review completed successfully")) {
      return tr("Review completed successfully.", "تمت مراجعة العقد بنجاح.");
    }

    if (msg.includes("existing review loaded")) {
      return tr(
        "Existing review loaded. The AI workflow was not executed again.",
        "تم تحميل المراجعة الموجودة بالفعل، ولم يتم تشغيل الذكاء الاصطناعي مرة أخرى.",
      );
    }

    return message;
  };

  const showMessage = (value, type = "info") => {
    const text = getUserFriendlyMessage(value);
    setMessage(text);

    if (!text) {
      setPopup({ open: false, title: "", message: "", type: "info" });
      return;
    }

    const looksLikeError =
      /failed|error|unable|cannot|permission|expired|no saved|not enough|couldn't|could not|تعذر|فشل|صلاحية|انتهت|لا توجد|لا يوجد/i.test(
        text,
      );
    const finalType = type === "error" || looksLikeError ? "error" : "info";

    setPopup({
      open: true,
      title:
        finalType === "error"
          ? tr("Error", "خطأ")
          : tr("Information", "معلومة"),
      message: text,
      type: finalType,
    });
  };

  const userRole = (localStorage.getItem("user_role") || "").toLowerCase();
  const canReview = ["reviewer", "counsel"].includes(userRole);

  const fetchDocuments = async () => {
    if (!token()) {
      setDocuments([]);
      setFilename("");
      localStorage.removeItem("filename");
      showMessage("Please login first to view your documents.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await response.json();

      if (response.status === 401) {
        ["access_token", "username", "user_role", "filename"].forEach((k) =>
          localStorage.removeItem(k),
        );
        setDocuments([]);
        setFilename("");
        showMessage("Your session has expired. Please login again.");
        return;
      }

      if (!response.ok) {
        showMessage(
          data.detail || data.message || "Unable to load documents.",
          "error",
        );
        return;
      }

      setDocuments(data.documents || []);
    } catch {
      showMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const uploadDocument = async () => {
    if (!file) return showMessage("Please select a PDF file first.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      showMessage("");
      setReview(null);
      setDeviation(null);
      setActiveView(null);

      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage(
          data.detail || data.message || "Unable to upload the document.",
          "error",
        );
        return;
      }

      setFilename(data.filename);
      localStorage.setItem("filename", data.filename);
      showMessage(data.message || "Document uploaded successfully.");
      await fetchDocuments();
    } catch {
      showMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const indexDocument = async (selectedFilename) => {
    if (!selectedFilename) {
      showMessage("Please select a document first.");
      return;
    }

    if (!token()) {
      showMessage(
        "You are not logged in. Please login first to index this document.",
      );
      return;
    }

    try {
      setLoading(true);
      setProcessType("index");
      showMessage("Indexing process is running... Please wait.");
      setReview(null);
      setDeviation(null);
      setActiveView(null);

      const response = await fetch(
        `${API_URL}/documents/index/${encodeURIComponent(selectedFilename)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token()}`,
          },
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        ["access_token", "username", "user_role"].forEach((key) =>
          localStorage.removeItem(key),
        );

        showMessage("Your session has expired. Please login again.");
        return;
      }

      if (response.status === 403) {
        showMessage("You do not have permission to index this document.");
        return;
      }

      if (!response.ok) {
        showMessage(
          data.detail || data.message || "Unable to index the document.",
          "error",
        );
        return;
      }

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);

      showMessage(
        `${data.message} - ${data.number_of_chunks} clauses indexed. Reloading the page...`,
      );

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch {
      showMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const reviewDocument = async (selectedFilename) => {
    if (!selectedFilename)
      return showMessage("Please select a document first.");
    if (!token())
      return showMessage(
        "You are not logged in. Please login first to view this review.",
      );

    try {
      setLoading(true);
      setProcessType("review");
      showMessage("Review process is running... Please wait.");

      const response = await fetch(
        `${API_URL}/documents/review/${encodeURIComponent(selectedFilename)}`,
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      const data = await response.json();

      if (response.status === 401) {
        ["access_token", "username", "user_role"].forEach((k) =>
          localStorage.removeItem(k),
        );
        showMessage("Your session has expired. Please login again.");
        return;
      }

      if (response.status === 404)
        return showMessage("No saved review found for this document.");
      if (response.status === 403)
        return showMessage("You do not have permission to view this review.");
      if (!response.ok)
        return showMessage(
          data.detail || data.message || "Unable to load the review.",
          "error",
        );

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);
      setReview(data.review);
      setDeviation(null);
      setActiveView("review");
      showMessage(data.message || "Saved review loaded successfully.");
    } catch {
      showMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const runReviewIfNeeded = async (selectedFilename) => {
    if (!selectedFilename)
      return showMessage("Please select a document first.");
    if (!token())
      return showMessage(
        "You are not logged in. Please login first to review this document.",
      );

    try {
      setLoading(true);
      setProcessType("review");
      showMessage("Review process is running... Please wait.");

      const response = await fetch(
        `${API_URL}/documents/review/${encodeURIComponent(selectedFilename)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}` },
        },
      );
      const data = await response.json();

      if (response.status === 401) {
        ["access_token", "username", "user_role"].forEach((k) =>
          localStorage.removeItem(k),
        );
        showMessage("Your session has expired. Please login again.");
        return;
      }

      if (response.status === 403)
        return showMessage(
          "You do not have permission to review this document.",
        );
      if (!response.ok)
        return showMessage(
          data.detail || data.message || "Unable to review this document.",
          "error",
        );

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);
      setReview(data.review);
      setDeviation(null);
      setActiveView("review");

      const msg = data.cached
        ? "Existing review loaded. The AI workflow was not executed again."
        : "Review completed successfully. Reloading the page...";
      showMessage(msg);

      if (!data.cached) setTimeout(() => window.location.reload(), 700);
    } catch {
      showMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const deviationDocument = async (selectedFilename) => {
    if (!selectedFilename)
      return showMessage("Please select a document first.");
    if (!token())
      return showMessage(
        "You are not logged in. Please login first to view deviation analysis.",
      );

    try {
      setLoading(true);
      setProcessType("deviation");

      const response = await fetch(
        `${API_URL}/documents/deviation/${encodeURIComponent(selectedFilename)}`,
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      const data = await response.json();

      if (response.status === 404) {
        setDeviation(null);
        return showMessage(
          "No saved deviation analysis found. Click 'Analyze Deviation' to create it.",
        );
      }

      if (response.status === 401) {
        ["access_token", "username", "user_role"].forEach((k) =>
          localStorage.removeItem(k),
        );
        return showMessage("Your session has expired. Please login again.");
      }

      if (!response.ok) {
        return showMessage(
          data.detail || data.message || "Unable to load deviation analysis.",
          "error",
        );
      }

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);
      setDeviation(data);
      setReview(null);
      setActiveView("deviation");
      showMessage("Saved deviation analysis loaded successfully.");
    } catch {
      showMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const runDeviationIfNeeded = async (selectedFilename) => {
    if (!selectedFilename)
      return showMessage("Please select a document first.");
    if (!token())
      return showMessage(
        "You are not logged in. Please login first to analyze deviation.",
      );

    try {
      setLoading(true);
      setProcessType("deviation");
      showMessage("Deviation analysis is running... Please wait.");

      const response = await fetch(
        `${API_URL}/documents/deviation/${encodeURIComponent(selectedFilename)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}` },
        },
      );
      const data = await response.json();

      if (!response.ok) {
        showMessage(
          data.detail || data.message || "Unable to analyze deviation.",
          "error",
        );
        return;
      }

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);
      setDeviation(data);
      setReview(null);
      setActiveView("deviation");

      const msg = data.cached
        ? "Existing deviation analysis loaded. No new AI analysis was executed."
        : "Deviation analysis completed successfully. Reloading the page...";
      showMessage(msg);

      if (!data.cached) setTimeout(() => window.location.reload(), 700);
    } catch {
      showMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const deleteDocument = async (document) => {
    if (!document?.stored_filename) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.original_filename}"?`,
    );
    if (!confirmed) return;

    if (!token()) {
      showMessage("You are not logged in. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      setProcessType("delete");

      const response = await fetch(
        `${API_URL}/documents/${encodeURIComponent(document.stored_filename)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token()}` },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        ["access_token", "username", "user_role", "filename"].forEach((key) =>
          localStorage.removeItem(key),
        );
        showMessage("Your session has expired. Please log in again.");
        return;
      }

      if (response.status === 403) {
        showMessage("You don't have permission to delete this document.");
        return;
      }

      if (!response.ok) {
        showMessage(
          data.detail ||
            data.message ||
            "We couldn't delete this document. Please try again.",
        );
        return;
      }

      if (filename === document.stored_filename) {
        setFilename("");
        localStorage.removeItem("filename");
        setReview(null);
        setDeviation(null);
        setActiveView(null);
      }

      await fetchDocuments();
      showMessage(data.message || "The document was deleted successfully.");
    } catch {
      showMessage(
        "We couldn't connect to the server. Please make sure the backend is running and try again.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const selectDocument = (document) => {
    setFilename(document.stored_filename);
    localStorage.setItem("filename", document.stored_filename);
    setReview(null);
    setDeviation(null);
    setActiveView(null);
    showMessage(
      `${tr("Selected document:", "المستند المحدد:")} ${document.original_filename}`,
    );
  };

  const submitApproval = async (decision) => {
    if (!filename) return showMessage("Please select a document first.");
    if (!token())
      return showMessage(
        "You are not logged in. Please login first to approve or reject this document.",
      );

    try {
      setLoading(true);
      showMessage("");

      const response = await fetch(
        `${API_URL}/documents/approval/${encodeURIComponent(filename)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            comment: `Decision submitted by ${localStorage.getItem("username") || "user"}`,
          }),
        },
      );
      const data = await response.json();

      if (response.status === 401) {
        ["access_token", "username", "user_role"].forEach((k) =>
          localStorage.removeItem(k),
        );
        showMessage("Your session has expired. Please login again.");
        return;
      }

      if (response.status === 403) {
        showMessage(
          "You do not have permission to approve or reject this document.",
        );
        return;
      }

      if (!response.ok) {
        showMessage(
          data.detail ||
            data.message ||
            "Unable to process the approval request.",
        );
        return;
      }

      showMessage(data.message || "Approval decision submitted successfully.");
      setReview(null);
      setActiveView(null);
      await fetchDocuments();
    } catch {
      showMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const getStatusClass = (status) =>
    ({
      indexed: "bg-primary",
      reviewed: "bg-success",
      approved: "bg-success",
      rejected: "bg-danger",
      uploaded: "bg-warning text-dark",
      failed: "bg-danger",
    })[status] || "bg-secondary";

  const translateStatus = (status) => {
    const values = {
      indexed: ["indexed", "مفهرس"],
      reviewed: ["reviewed", "تمت المراجعة"],
      approved: ["approved", "تمت الموافقة"],
      rejected: ["rejected", "مرفوض"],
      uploaded: ["uploaded", "مرفوع"],
      failed: ["failed", "فشل"],
    };
    const pair = values[status] || [status, status];
    return tr(pair[0], pair[1]);
  };

  const canAct = canReview;

  return (
    <>
      {loading && processType && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,.45)", zIndex: 2000 }}
        >
          <div
            className="bg-white rounded-4 shadow p-4 text-center"
            style={{ minWidth: 320 }}
          >
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Processing...</span>
            </div>
            <h5>
              {processType === "review"
                ? tr("Review in Progress", "جاري مراجعة العقد")
                : processType === "deviation"
                  ? tr("Deviation Analysis in Progress", "جاري تحليل الانحراف")
                  : processType === "delete"
                    ? tr("Deleting Document", "جاري حذف المستند")
                    : tr("Indexing in Progress", "جاري الفهرسة")}
            </h5>
            <p className="text-muted mb-0">
              {processType === "delete"
                ? tr(
                    "The document is being deleted. Please wait...",
                    "جاري حذف المستند. من فضلك انتظر...",
                  )
                : tr(
                    "The AI is processing the document. Please wait...",
                    "الذكاء الاصطناعي يعالج المستند. من فضلك انتظر...",
                  )}
            </p>
          </div>
        </div>
      )}

      {popup.open && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,.45)", zIndex: 3000 }}
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div
            className="bg-white rounded-4 shadow p-4"
            style={{
              width: "min(460px, 90vw)",
              textAlign: isArabic ? "right" : "left",
            }}
          >
            <h5
              className={`mb-3 ${popup.type === "error" ? "text-danger" : "text-primary"}`}
            >
              {popup.title}
            </h5>
            <p className="mb-4" style={{ lineHeight: 1.8 }}>
              {popup.message}
            </p>
            <div className="text-end">
              <button
                type="button"
                className="btn btn-primary px-4"
                onClick={() =>
                  setPopup({
                    open: false,
                    title: "",
                    message: "",
                    type: "info",
                  })
                }
              >
                {tr("OK", "حسنًا")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard" dir={isArabic ? "rtl" : "ltr"}>
        <div className="welcome">
          <h2>{tr("Documents", "المستندات")}</h2>
          <p>
            {tr(
              "Upload, index, review, and manage your legal contracts.",
              "رفع وفهرسة ومراجعة وإدارة العقود القانونية.",
            )}
          </p>
        </div>

        <div className="content-card mt-4">
          <h5>{tr("Upload Contract", "رفع العقد")}</h5>
          <input
            type="file"
            accept=".pdf"
            className="form-control mt-3"
            onChange={(e) => {
              setFile(e.target.files[0]);
              showMessage("");
              setReview(null);
              setDeviation(null);
              setActiveView(null);
            }}
          />

          <div className="d-flex gap-2 mt-3 flex-wrap">
            <button
              className="btn btn-primary px-4"
              onClick={uploadDocument}
              disabled={loading}
            >
              {loading
                ? tr("Processing...", "جارٍ التنفيذ...")
                : tr("Upload Contract", "رفع العقد")}
            </button>

            {file && (
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setFile(null);
                  showMessage("File selection cleared.");
                }}
                disabled={loading}
              >
                {tr("Clear", "مسح")}
              </button>
            )}
          </div>
        </div>

        <div className="content-card mt-4">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">{tr("My Documents", "مستنداتي")}</h5>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={fetchDocuments}
              disabled={loading}
            >
              {tr("Refresh", "تحديث")}
            </button>
          </div>

          {documents.length === 0 ? (
            <p className="mt-4 text-muted">
              {tr("No documents found.", "لم يتم العثور على مستندات.")}
            </p>
          ) : (
            <div className="table-responsive mt-4">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>{tr("Document", "المستند")}</th>
                    <th>{tr("Status", "الحالة")}</th>
                    <th>{tr("Created", "تاريخ الإنشاء")}</th>
                    <th>{tr("Updated", "آخر تحديث")}</th>
                    <th>{tr("Actions", "الإجراءات")}</th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td>
                        <strong>{document.original_filename}</strong>
                        <div className="small text-muted">
                          {tr("Stored:", "الملف المحفوظ:")}{" "}
                          {document.stored_filename}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${getStatusClass(document.status)}`}
                        >
                          {translateStatus(document.status)}
                        </span>
                      </td>

                      <td>
                        {document.created_at
                          ? new Date(document.created_at).toLocaleString()
                          : "-"}
                      </td>

                      <td>
                        {document.updated_at
                          ? new Date(document.updated_at).toLocaleString()
                          : "-"}
                      </td>

                      <td>
                        <div className="d-flex gap-2 flex-wrap align-items-center">
                          {canAct && (
                            <ActionButton
                              style={buttonStyles.delete}
                              onClick={() => deleteDocument(document)}
                              disabled={loading}
                            >
                              {loading && processType === "delete"
                                ? tr("Deleting...", "جارٍ الحذف...")
                                : tr("Delete", "حذف")}
                            </ActionButton>
                          )}

                          {document.status === "failed" && canAct && (
                            <ActionButton
                              style={buttonStyles.retry}
                              onClick={() =>
                                indexDocument(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              {tr("Upload Again", "إعادة الرفع")}
                            </ActionButton>
                          )}

                          {document.status === "indexed" && canAct && (
                            <>
                              <ActionButton
                                style={buttonStyles.review}
                                onClick={() => {
                                  setActiveView("review");
                                  setDeviation(null);
                                  runReviewIfNeeded(document.stored_filename);
                                }}
                                disabled={loading}
                              >
                                {loading && processType === "review"
                                  ? tr("Reviewing...", "جارٍ المراجعة...")
                                  : tr("Review Contract", "مراجعة العقد")}
                              </ActionButton>

                              <ActionButton
                                style={buttonStyles.deviation}
                                onClick={() => {
                                  setActiveView("deviation");
                                  setReview(null);
                                  runDeviationIfNeeded(
                                    document.stored_filename,
                                  );
                                }}
                                disabled={loading}
                              >
                                {loading && processType === "deviation"
                                  ? tr("Analyzing...", "جارٍ التحليل...")
                                  : tr("Analyze Deviation", "تحليل الانحراف")}
                              </ActionButton>
                            </>
                          )}

                          {["reviewed", "approved", "rejected"].includes(
                            document.status,
                          ) &&
                            canAct && (
                              <>
                                <ActionButton
                                  style={buttonStyles.view}
                                  onClick={() => {
                                    setActiveView("review");
                                    setDeviation(null);
                                    reviewDocument(document.stored_filename);
                                  }}
                                  disabled={loading}
                                >
                                  {tr("View Review", "عرض المراجعة")}
                                </ActionButton>

                                <ActionButton
                                  style={buttonStyles.deviation}
                                  onClick={() => {
                                    setActiveView("deviation");
                                    setReview(null);
                                    deviationDocument(document.stored_filename);
                                  }}
                                  disabled={loading}
                                >
                                  {tr("View Deviation", "عرض تحليل الانحراف")}
                                </ActionButton>

                                <ActionButton
                                  style={buttonStyles.reject}
                                  onClick={() => {
                                    setActiveView("deviation");
                                    setReview(null);
                                    runDeviationIfNeeded(
                                      document.stored_filename,
                                    );
                                  }}
                                  disabled={loading}
                                >
                                  {loading && processType === "deviation"
                                    ? tr("Analyzing...", "جارٍ التحليل...")
                                    : tr("Analyze Deviation", "تحليل الانحراف")}
                                </ActionButton>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filename && (
          <div className="alert alert-info mt-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              {tr("Selected document:", "المستند المحدد:")}{" "}
              <strong>{filename}</strong>
            </div>

            <button
              className="btn btn-sm btn-outline-dark"
              onClick={() => {
                setFilename("");
                localStorage.removeItem("filename");
                setReview(null);
                setDeviation(null);
                setActiveView(null);
              }}
              disabled={loading}
            >
              {tr("Clear Selection", "إلغاء تحديد المستند")}
            </button>
          </div>
        )}

        {message && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{
              background: "rgba(0,0,0,.45)",
              zIndex: 3000,
            }}
            onClick={() => showMessage("")}
          >
            <div
              className="bg-white rounded-4 shadow p-4"
              style={{ minWidth: 360, maxWidth: 520 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex align-items-center gap-2 mb-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: 38,
                    height: 38,
                    background:
                      /failed|error|unable|cannot|permission|expired|no saved|not enough|couldn't|could not/i.test(
                        message,
                      )
                        ? "#fdecec"
                        : "#eef5ff",
                    color:
                      /failed|error|unable|cannot|permission|expired|no saved|not enough|couldn't|could not/i.test(
                        message,
                      )
                        ? "#b42318"
                        : "#2563eb",
                    fontWeight: 700,
                  }}
                >
                  !
                </div>
                <h5 className="mb-0">
                  {/failed|error|unable|cannot|permission|expired|no saved|not enough|couldn't|could not/i.test(
                    message,
                  )
                    ? "Error"
                    : "Information"}
                </h5>
              </div>

              <p className="mb-4" style={{ lineHeight: 1.7 }}>
                {message}
              </p>

              <div className="text-end">
                <button
                  type="button"
                  className="btn btn-primary px-4"
                  onClick={() => showMessage("")}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === "review" && review && (
          <div className="content-card mt-4">
            <h5>{tr("Contract Review", "مراجعة العقد")}</h5>

            {review.risks?.length > 0 ? (
              <div className="mt-3">
                {review.risks.map((item, index) => (
                  <div className="border rounded p-3 mb-3" key={index}>
                    <h6>{item.title}</h6>
                    <p>
                      <strong>{tr("Risk:", "مستوى الخطر:")}</strong>{" "}
                      {item.risk?.risk_level}
                    </p>
                    <p>
                      <strong>{tr("Reason:", "السبب:")}</strong>{" "}
                      {item.risk?.reason}
                    </p>
                    <p>
                      <strong>{tr("Evidence:", "الدليل:")}</strong>{" "}
                      {item.risk?.evidence}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-3">
                {tr("No risk issues found.", "لا توجد مخاطر في العقد.")}
              </p>
            )}

            {review.memo && (
              <div className="content-card mt-4">
                <h5 className="mb-3">{tr("Risk Memo", "مذكرة المخاطر")}</h5>

                <div
                  className="border rounded p-4 bg-light"
                  dir="auto"
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.9",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    textAlign: "start",
                    fontSize: "15px",
                  }}
                >
                  {review.memo}
                </div>

                {userRole === "counsel" && (
                  <div className="d-flex gap-2 mt-4">
                    <button
                      className="btn btn-sm"
                      style={buttonStyles.review}
                      onClick={() => submitApproval("approved")}
                      disabled={loading}
                    >
                      {tr("Approve", "موافقة")}
                    </button>

                    <button
                      className="btn btn-sm"
                      style={buttonStyles.reject}
                      onClick={() => submitApproval("rejected")}
                      disabled={loading}
                    >
                      {tr("Reject", "رفض")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === "deviation" && deviation && (
          <div className="content-card mt-4">
            <h5>{tr("Deviation Analysis", "تحليل الانحراف")}</h5>

            {deviation.results?.length > 0 ? (
              <div className="mt-3">
                {deviation.results.map((item, index) => (
                  <div className="border rounded p-3 mb-3" key={index}>
                    <h6>{item.title}</h6>

                    {item.rule && (
                      <div
                        className="border rounded p-3 mb-3"
                        dir="auto"
                        style={{
                          backgroundColor: "#f8fafc",
                          borderColor: "#dbe2ea",
                        }}
                      >
                        <h6 className="mb-2">
                          {tr("Playbook Rule", "قاعدة الـ Playbook")}
                        </h6>

                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.8",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            textAlign: "start",
                          }}
                        >
                          {typeof item.rule === "string"
                            ? item.rule
                            : item.rule.expected || JSON.stringify(item.rule)}
                        </div>
                      </div>
                    )}

                    {item.deviation && typeof item.deviation === "string" && (
                      <p>
                        <strong>{tr("Deviation:", "الانحراف:")}</strong>{" "}
                        {item.deviation}
                      </p>
                    )}

                    {item.deviation && typeof item.deviation === "object" && (
                      <>
                        <p>
                          <strong>{tr("Deviation:", "الانحراف:")}</strong>{" "}
                          {item.deviation.deviation
                            ? tr("Yes", "نعم")
                            : tr("No", "لا")}
                        </p>

                        {item.deviation.reason && (
                          <p>
                            <strong>{tr("Reason:", "السبب:")}</strong>{" "}
                            {item.deviation.reason}
                          </p>
                        )}
                      </>
                    )}

                    {!item.rule && item.reason && (
                      <p>
                        <strong>{tr("Result:", "النتيجة:")}</strong>{" "}
                        {item.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-3">
                {tr("No deviation results found.", "لا توجد نتائج انحراف.")}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
