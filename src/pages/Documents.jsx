import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const API_URL = "http://127.0.0.1:8000";

export default function Documents() {
  const { t, language } = useLanguage();

  const isArabic = language === "ar";

  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");

  const [documents, setDocuments] = useState([]);
  const [review, setReview] = useState(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setDocuments([]);
      setFilename("");
      localStorage.removeItem("filename");

      setMessage(
        isArabic
          ? "يرجى تسجيل الدخول أولًا لعرض المستندات."
          : "Please login first to view your documents.",
      );

      return;
    }

    try {
      const response = await fetch(`${API_URL}/documents`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("user_role");
        localStorage.removeItem("filename");

        setDocuments([]);
        setFilename("");

        setMessage(
          isArabic
            ? "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى."
            : "Your session has expired. Please login again.",
        );

        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail ||
            data.message ||
            (isArabic ? "تعذر تحميل المستندات." : "Unable to load documents."),
        );

        return;
      }

      setDocuments(data.documents || []);
    } catch {
      setMessage(
        isArabic
          ? "تعذر الاتصال بالخادم. تأكد من تشغيل الـ backend."
          : "Unable to connect to the server. Please make sure the backend is running.",
      );
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const uploadDocument = async () => {
    if (!file) {
      setMessage(
        isArabic
          ? "يرجى اختيار ملف PDF أولًا."
          : "Please select a PDF file first.",
      );
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        isArabic
          ? "يرجى تسجيل الدخول أولًا لرفع المستند."
          : "Please login first to upload a document.",
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setMessage("");
      setReview(null);

      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("user_role");
        localStorage.removeItem("filename");

        setMessage(
          isArabic
            ? "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى."
            : "Your session has expired. Please login again.",
        );

        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail ||
            data.message ||
            (isArabic ? "تعذر رفع المستند." : "Unable to upload the document."),
        );

        return;
      }

      setFilename(data.filename);

      localStorage.setItem("filename", data.filename);

      setMessage(
        isArabic ? "تم رفع المستند بنجاح." : "Document uploaded successfully.",
      );

      await fetchDocuments();
    } catch {
      setMessage(
        isArabic
          ? "تعذر الاتصال بالخادم. تأكد من تشغيل الـ backend."
          : "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const indexDocument = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage(
        isArabic
          ? "يرجى اختيار مستند أولًا."
          : "Please select a document first.",
      );
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        isArabic
          ? "يرجى تسجيل الدخول أولًا لفهرسة المستند."
          : "You are not logged in. Please login first to index this document.",
      );
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setReview(null);

      const response = await fetch(
        `${API_URL}/documents/index/${encodeURIComponent(selectedFilename)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("user_role");

        setMessage(
          isArabic
            ? "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى."
            : "Your session has expired. Please login again.",
        );

        return;
      }

      if (response.status === 403) {
        setMessage(
          isArabic
            ? "ليس لديك صلاحية لفهرسة هذا المستند."
            : "You do not have permission to index this document.",
        );

        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail ||
            data.message ||
            (isArabic
              ? "تعذر فهرسة المستند."
              : "Unable to index the document."),
        );

        return;
      }

      setFilename(selectedFilename);

      localStorage.setItem("filename", selectedFilename);

      setMessage(
        `${data.number_of_chunks} ${
          isArabic ? "بنود تمت فهرستها." : "clauses indexed."
        }`,
      );

      await fetchDocuments();
    } catch {
      setMessage(
        isArabic
          ? "تعذر الاتصال بالخادم. تأكد من تشغيل الـ backend."
          : "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const reviewDocument = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage(
        isArabic
          ? "يرجى اختيار مستند أولًا."
          : "Please select a document first.",
      );
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        isArabic
          ? "يرجى تسجيل الدخول أولًا لمراجعة هذا المستند."
          : "You are not logged in. Please login first to review this document.",
      );

      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/documents/review/${encodeURIComponent(selectedFilename)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("user_role");

        setMessage(
          isArabic
            ? "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى."
            : "Your session has expired. Please login again.",
        );

        return;
      }

      if (response.status === 403) {
        setMessage(
          isArabic
            ? "ليس لديك صلاحية لمراجعة هذا المستند."
            : "You do not have permission to review this document.",
        );

        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail ||
            data.message ||
            (isArabic
              ? "تعذر مراجعة المستند."
              : "Unable to review this document."),
        );

        return;
      }

      setFilename(selectedFilename);

      localStorage.setItem("filename", selectedFilename);

      setReview(data.review);

      setMessage(
        isArabic
          ? "تمت مراجعة المستند بنجاح."
          : "Document reviewed successfully.",
      );

      await fetchDocuments();
    } catch {
      setMessage(
        isArabic
          ? "تعذر الاتصال بالخادم. تأكد من تشغيل الـ backend."
          : "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectDocument = (document) => {
    setFilename(document.stored_filename);

    localStorage.setItem("filename", document.stored_filename);

    setReview(null);

    setMessage(
      isArabic
        ? `تم اختيار المستند: ${document.original_filename}`
        : `Selected document: ${document.original_filename}`,
    );
  };

  const deleteDocument = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage(
        isArabic
          ? "يرجى اختيار مستند أولًا."
          : "Please select a document first.",
      );

      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        isArabic
          ? "يرجى تسجيل الدخول أولًا لحذف المستند."
          : "You are not logged in. Please login first to delete this document.",
      );

      return;
    }

    const confirmed = window.confirm(
      isArabic
        ? "هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء."
        : "Are you sure you want to delete this document? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setReview(null);

      const response = await fetch(
        `${API_URL}/documents/${encodeURIComponent(selectedFilename)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("user_role");
        localStorage.removeItem("filename");

        setMessage(
          isArabic
            ? "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى."
            : "Your session has expired. Please login again.",
        );

        return;
      }

      if (response.status === 403) {
        setMessage(
          isArabic
            ? "فقط الـ Counsel يمكنه حذف المستندات."
            : "Only counsel can delete documents.",
        );

        return;
      }

      if (response.status === 404) {
        setMessage(
          data.detail ||
            (isArabic ? "المستند غير موجود." : "Document not found."),
        );

        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail ||
            data.message ||
            (isArabic ? "تعذر حذف المستند." : "Unable to delete the document."),
        );

        return;
      }

      if (filename === selectedFilename) {
        setFilename("");
        localStorage.removeItem("filename");
        setReview(null);
      }

      setMessage(
        data.message ||
          (isArabic
            ? "تم حذف المستند بنجاح."
            : "Document deleted successfully."),
      );

      await fetchDocuments();
    } catch {
      setMessage(
        isArabic
          ? "تعذر الاتصال بالخادم. تأكد من تشغيل الـ backend."
          : "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const submitApproval = async (decision) => {
    if (!filename) {
      setMessage(
        isArabic
          ? "يرجى اختيار مستند أولًا."
          : "Please select a document first.",
      );

      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        isArabic
          ? "يرجى تسجيل الدخول أولًا للموافقة أو الرفض."
          : "You are not logged in. Please login first to approve or reject this document.",
      );

      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/documents/approval/${encodeURIComponent(
          filename,
        )}?decision=${decision}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("user_role");

        setMessage(
          isArabic
            ? "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى."
            : "Your session has expired. Please login again.",
        );

        return;
      }

      if (response.status === 403) {
        setMessage(
          isArabic
            ? "ليس لديك صلاحية للموافقة أو الرفض."
            : "You do not have permission to approve or reject this document.",
        );

        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail ||
            data.message ||
            (isArabic
              ? "تعذر تنفيذ قرار الموافقة."
              : "Unable to process the approval request."),
        );

        return;
      }

      setMessage(
        data.message ||
          (isArabic
            ? "تم تنفيذ القرار بنجاح."
            : "Approval decision submitted successfully."),
      );

      setReview(null);

      await fetchDocuments();
    } catch {
      setMessage(
        isArabic
          ? "تعذر الاتصال بالخادم. تأكد من تشغيل الـ backend."
          : "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "indexed":
        return "bg-primary";

      case "reviewed":
        return "bg-success";

      case "approved":
        return "bg-success";

      case "rejected":
        return "bg-danger";

      case "uploaded":
      default:
        return "bg-warning text-dark";
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="welcome">
        <h2>{t("documents")}</h2>

        <p>
          {isArabic
            ? "ارفع العقود وقم بفهرستها ومراجعتها وإدارتها."
            : "Upload, index, review, and manage your legal contracts."}
        </p>
      </div>

      {/* Upload */}
      <div className="content-card mt-4">
        <h5>{t("uploadContract")}</h5>

        <input
          type="file"
          accept=".pdf"
          className="form-control mt-3"
          onChange={(event) => {
            setFile(event.target.files[0]);
            setMessage("");
            setReview(null);
          }}
        />

        <button
          type="button"
          className="btn btn-primary mt-3"
          onClick={uploadDocument}
          disabled={loading}
        >
          {loading
            ? isArabic
              ? "جاري التنفيذ..."
              : "Processing..."
            : t("uploadContract")}
        </button>
      </div>

      {/* Documents */}
      <div className="content-card mt-4">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">{t("myDocuments")}</h5>

          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={fetchDocuments}
            disabled={loading}
          >
            {t("refresh")}
          </button>
        </div>

        {documents.length === 0 ? (
          <p className="mt-4 text-muted">
            {isArabic ? "لا توجد مستندات." : "No documents found."}
          </p>
        ) : (
          <div className="table-responsive mt-4">
            <table className="table table-bordered align-middle">
              <thead>
                <tr>
                  <th>{isArabic ? "المستند" : "Document"}</th>

                  <th>{t("status")}</th>

                  <th>{t("created")}</th>

                  <th>{t("updated")}</th>

                  <th>{isArabic ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>

              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <strong>{document.original_filename}</strong>

                      <div className="small text-muted">
                        {isArabic ? "اسم التخزين:" : "Stored:"}{" "}
                        {document.stored_filename}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge ${getStatusClass(document.status)}`}
                      >
                        {document.status}
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
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => selectDocument(document)}
                          disabled={loading}
                        >
                          {t("select")}
                        </button>

                        {document.status === "uploaded" && (
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() =>
                              indexDocument(document.stored_filename)
                            }
                            disabled={loading}
                          >
                            {t("index")}
                          </button>
                        )}

                        {document.status === "indexed" && (
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() =>
                              reviewDocument(document.stored_filename)
                            }
                            disabled={loading}
                          >
                            {t("review")}
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() =>
                            deleteDocument(document.stored_filename)
                          }
                          disabled={loading}
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Document */}
      {filename && (
        <div className="alert alert-info mt-4">
          {isArabic ? "المستند المختار:" : "Selected document:"}{" "}
          <strong>{filename}</strong>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className="alert alert-light border mt-4">{message}</div>
      )}

      {/* Review */}
      {review && (
        <div className="content-card mt-4">
          <h5>{isArabic ? "مراجعة العقد" : "Contract Review"}</h5>

          {review.risks?.length > 0 ? (
            <div className="mt-3">
              {review.risks.map((item, index) => (
                <div className="border rounded p-3 mb-3" key={index}>
                  <h6>{item.title}</h6>

                  <p>
                    <strong>{isArabic ? "المخاطر:" : "Risk:"}</strong>{" "}
                    {item.risk?.risk_level}
                  </p>

                  <p>
                    <strong>{isArabic ? "السبب:" : "Reason:"}</strong>{" "}
                    {item.risk?.reason}
                  </p>

                  <p>
                    <strong>{isArabic ? "الدليل:" : "Evidence:"}</strong>{" "}
                    {item.risk?.evidence}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted mt-3">
              {isArabic ? "لم يتم العثور على مخاطر." : "No risk issues found."}
            </p>
          )}

          {review.memo && (
            <div className="alert alert-secondary mt-4">
              <h6>{t("riskMemo")}</h6>

              <p className="mb-0">{review.memo}</p>

              <div className="d-flex gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => submitApproval("approved")}
                  disabled={loading}
                >
                  {t("approve")}
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => submitApproval("rejected")}
                  disabled={loading}
                >
                  {t("reject")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
