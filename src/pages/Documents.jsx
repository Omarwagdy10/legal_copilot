import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const API_URL = "http://127.0.0.1:8000";

export default function Documents() {
  const { t, language, setLanguage } = useLanguage();

  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [documents, setDocuments] = useState([]);
  const [review, setReview] = useState(null);
  const [deviation, setDeviation] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isArabic = language === "ar";

  const auth = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  });

  const statusText = (status) => t(`status_${status}`) || status;

  const fetchDocuments = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setDocuments([]);
      setFilename("");
      localStorage.removeItem("filename");
      setMessage(t("login_first"));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: auth(),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.clear();
        setDocuments([]);
        setFilename("");
        setMessage(t("session_expired"));
        return;
      }

      if (!response.ok) {
        setMessage(data.detail || data.message || t("load_documents_error"));
        return;
      }

      setDocuments(data.documents || []);
    } catch {
      setMessage(t("server_error"));
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const uploadDocument = async () => {
    if (!file) {
      setMessage(t("select_pdf"));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setMessage("");
      setReview(null);
      setDeviation(null);

      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: auth(),
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || data.message || t("upload_error"));
        return;
      }

      setFilename(data.filename);
      localStorage.setItem("filename", data.filename);

      setMessage(data.message || t("upload_success"));

      await fetchDocuments();
    } catch {
      setMessage(t("server_error"));
    } finally {
      setLoading(false);
    }
  };

  const indexDocument = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage(t("select_document"));
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(t("login_index"));
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
          headers: auth(),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.clear();
        setMessage(t("session_expired"));
        return;
      }

      if (response.status === 403) {
        setMessage(t("no_index_permission"));
        return;
      }

      if (!response.ok) {
        setMessage(data.detail || data.message || t("index_error"));
        return;
      }

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);

      setMessage(
        `${data.message} - ${data.number_of_chunks} ${t("clauses_indexed")}`,
      );

      await fetchDocuments();
    } catch {
      setMessage(t("server_error"));
    } finally {
      setLoading(false);
    }
  };

  const reviewDocument = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage(t("select_document"));
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(t("login_view_review"));
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/documents/review/${encodeURIComponent(selectedFilename)}`,
        {
          headers: auth(),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.clear();
        setMessage(t("session_expired"));
        return;
      }

      if (response.status === 404) {
        setMessage(t("no_saved_review"));
        return;
      }

      if (response.status === 403) {
        setMessage(t("no_review_permission"));
        return;
      }

      if (!response.ok) {
        setMessage(data.detail || data.message || t("review_load_error"));
        return;
      }

      setFilename(selectedFilename);
      setReview(data.review);
      setMessage(data.message || t("saved_review_loaded"));
    } catch {
      setMessage(t("server_error"));
    } finally {
      setLoading(false);
    }
  };

  const runReview = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage(t("select_document"));
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(t("login_review"));
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/documents/review/${encodeURIComponent(selectedFilename)}`,
        {
          method: "POST",
          headers: auth(),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.clear();
        setMessage(t("session_expired"));
        return;
      }

      if (response.status === 403) {
        setMessage(t("no_review_permission"));
        return;
      }

      if (!response.ok) {
        setMessage(data.detail || data.message || t("review_error"));
        return;
      }

      setFilename(selectedFilename);
      setReview(data.review);

      setMessage(data.cached ? t("existing_review") : t("new_review"));

      await fetchDocuments();
    } catch {
      setMessage(t("server_error"));
    } finally {
      setLoading(false);
    }
  };

  const viewDeviation = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage(t("select_document"));
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(t("login_deviation_view"));
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/documents/deviation/${encodeURIComponent(
          selectedFilename,
        )}`,
        {
          headers: auth(),
        },
      );

      const data = await response.json();

      if (response.status === 404) {
        setDeviation(null);
        setMessage(t("no_saved_deviation"));
        return;
      }

      if (response.status === 401) {
        localStorage.clear();
        setMessage(t("session_expired"));
        return;
      }

      if (!response.ok) {
        setMessage(data.detail || data.message || t("deviation_load_error"));
        return;
      }

      setFilename(selectedFilename);
      setDeviation(data);
      setMessage(t("saved_deviation_loaded"));
    } catch {
      setMessage(t("server_error"));
    } finally {
      setLoading(false);
    }
  };

  const runDeviation = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage(t("select_document"));
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(t("login_deviation"));
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/documents/deviation/${encodeURIComponent(
          selectedFilename,
        )}`,
        {
          method: "POST",
          headers: auth(),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || data.message || t("deviation_error"));
        return;
      }

      setFilename(selectedFilename);
      setDeviation(data);

      setMessage(data.cached ? t("existing_deviation") : t("new_deviation"));
    } catch {
      setMessage(t("server_error"));
    } finally {
      setLoading(false);
    }
  };

  const selectDocument = (document) => {
    setFilename(document.stored_filename);

    localStorage.setItem("filename", document.stored_filename);

    setReview(null);
    setDeviation(null);

    setMessage(`${t("selected_document")} ${document.original_filename}`);
  };

  const submitApproval = async (decision) => {
    if (!filename) {
      setMessage(t("select_document"));
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(t("login_approval"));
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/documents/approval/${encodeURIComponent(filename)}`,
        {
          method: "POST",
          headers: {
            ...auth(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            comment: `Decision submitted by ${
              localStorage.getItem("username") || "user"
            }`,
          }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.clear();
        setMessage(t("session_expired"));
        return;
      }

      if (response.status === 403) {
        setMessage(t("no_approval_permission"));
        return;
      }

      if (!response.ok) {
        setMessage(data.detail || data.message || t("approval_error"));
        return;
      }

      setMessage(data.message || t("approval_success"));

      setReview(null);
      await fetchDocuments();
    } catch {
      setMessage(t("server_error"));
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      indexed: "bg-primary",
      reviewed: "bg-success",
      approved: "bg-success",
      rejected: "bg-danger",
      uploaded: "bg-warning text-dark",
      failed: "bg-danger",
    };

    return classes[status] || "bg-secondary";
  };

  return (
    <div className="dashboard" dir={isArabic ? "rtl" : "ltr"}>


      {/* Header */}
      <div className="welcome">
        <h2>{t("documents")}</h2>
        <p>{t("documents_description")}</p>
      </div>

      {/* Upload */}
      <div className="content-card mt-4">
        <h5>{t("upload_contract")}</h5>

        <input
          type="file"
          accept=".pdf"
          className="form-control mt-3"
          onChange={(e) => {
            setFile(e.target.files[0]);
            setMessage("");
            setReview(null);
            setDeviation(null);
          }}
        />

        <div className="d-flex gap-2 mt-3 flex-wrap">
          <button
            className="btn btn-primary px-4"
            onClick={uploadDocument}
            disabled={loading}
          >
            {loading ? t("processing") : t("upload_contract")}
          </button>

          {file && (
            <button
              className="btn btn-outline-secondary"
              onClick={() => {
                setFile(null);
                setMessage(t("file_cleared"));
              }}
              disabled={loading}
            >
              {t("clear")}
            </button>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="content-card mt-4">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">{t("my_documents")}</h5>

          <button
            className="btn btn-sm btn-outline-primary"
            onClick={fetchDocuments}
            disabled={loading}
          >
            {t("refresh")}
          </button>
        </div>

        {documents.length === 0 ? (
          <p className="mt-4 text-muted">{t("no_documents")}</p>
        ) : (
          <div className="table-responsive mt-4">
            <table className="table table-bordered align-middle">
              <thead>
                <tr>
                  <th>{t("document")}</th>
                  <th>{t("status")}</th>
                  <th>{t("created")}</th>
                  <th>{t("updated")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>

              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <strong>{document.original_filename}</strong>

                      <div className="small text-muted">
                        {t("stored")}: {document.stored_filename}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge ${getStatusClass(document.status)}`}
                      >
                        {statusText(document.status)}
                      </span>
                    </td>

                    <td>
                      {document.created_at
                        ? new Date(document.created_at).toLocaleString(
                            isArabic ? "ar-EG" : "en-US",
                          )
                        : "-"}
                    </td>

                    <td>
                      {document.updated_at
                        ? new Date(document.updated_at).toLocaleString(
                            isArabic ? "ar-EG" : "en-US",
                          )
                        : "-"}
                    </td>

                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          className="btn btn-sm btn-outline-dark"
                          onClick={() => selectDocument(document)}
                          disabled={loading}
                        >
                          {t("select")}
                        </button>

                        {document.status === "failed" && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() =>
                              indexDocument(document.stored_filename)
                            }
                            disabled={loading}
                          >
                            {t("upload_again")}
                          </button>
                        )}

                        {document.status === "indexed" && (
                          <>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() =>
                                runReview(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              {t("review_contract")}
                            </button>

                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() =>
                                runDeviation(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              {t("analyze_deviation")}
                            </button>
                          </>
                        )}

                        {["reviewed", "approved", "rejected"].includes(
                          document.status,
                        ) && (
                          <>
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() =>
                                reviewDocument(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              {t("view_review")}
                            </button>

                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() =>
                                viewDeviation(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              {t("view_deviation")}
                            </button>

                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() =>
                                runDeviation(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              {t("analyze_deviation")}
                            </button>
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

      {/* Selected */}
      {filename && (
        <div className="alert alert-info mt-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            {t("selected_document")}: <strong>{filename}</strong>
          </div>

          <button
            className="btn btn-sm btn-outline-dark"
            onClick={() => {
              setFilename("");
              localStorage.removeItem("filename");
              setReview(null);
              setDeviation(null);
            }}
            disabled={loading}
          >
            {t("clear_selection")}
          </button>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="alert alert-light border mt-4">{message}</div>
      )}

      {/* Review */}
      {review && (
        <div className="content-card mt-4">
          <h5>{t("contract_review")}</h5>

          {review.risks?.length > 0 ? (
            <div className="mt-3">
              {review.risks.map((item, index) => (
                <div className="border rounded p-3 mb-3" key={index}>
                  <h6>{item.title}</h6>

                  <p>
                    <strong>{t("risk")}:</strong> {item.risk?.risk_level}
                  </p>

                  <p>
                    <strong>{t("reason")}:</strong> {item.risk?.reason}
                  </p>

                  <p>
                    <strong>{t("evidence")}:</strong> {item.risk?.evidence}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted mt-3">{t("no_risk")}</p>
          )}

          {review.memo && (
            <div className="alert alert-secondary mt-4">
              <h6>{t("risk_memo")}</h6>

              <p>{review.memo}</p>

              <div className="d-flex gap-2 mt-4">
                <button
                  className="btn btn-success"
                  onClick={() => submitApproval("approved")}
                  disabled={loading}
                >
                  {t("approve")}
                </button>

                <button
                  className="btn btn-danger"
                  onClick={() => submitApproval("rejected")}
                  disabled={loading}
                >
                  {t("reject")}
                </button>
              </div>

              <p className="small text-muted mt-3 mb-0">{t("approval_note")}</p>
            </div>
          )}
        </div>
      )}

      {/* Deviation */}
      {deviation && (
        <div className="content-card mt-4">
          <h5>{t("deviation_analysis")}</h5>

          {deviation.results?.length > 0 ? (
            <div className="mt-3">
              {deviation.results.map((item, index) => (
                <div className="border rounded p-3 mb-3" key={index}>
                  <h6>{item.title}</h6>

                  {item.rule && (
                    <p>
                      <strong>{t("playbook_rule")}:</strong>{" "}
                      {typeof item.rule === "string"
                        ? item.rule
                        : JSON.stringify(item.rule)}
                    </p>
                  )}

                  {item.deviation && (
                    <>
                      <p>
                        <strong>{t("deviation")}:</strong>{" "}
                        {typeof item.deviation === "string"
                          ? item.deviation
                          : item.deviation.deviation
                            ? t("yes")
                            : t("no")}
                      </p>

                      {item.deviation.reason && (
                        <p>
                          <strong>{t("reason")}:</strong>{" "}
                          {item.deviation.reason}
                        </p>
                      )}
                    </>
                  )}

                  {!item.rule && item.reason && (
                    <p>
                      <strong>{t("result")}:</strong> {item.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted mt-3">{t("no_deviation")}</p>
          )}
        </div>
      )}
    </div>
  );
}
