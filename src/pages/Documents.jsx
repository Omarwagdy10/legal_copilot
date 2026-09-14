import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

const token = () => localStorage.getItem("access_token");

const buttonStyles = {
  select: {
    background: "#eef2f7",
    color: "#334155",
    border: "1px solid #d9e0e8",
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
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [documents, setDocuments] = useState([]);
  const [review, setReview] = useState(null);
  const [deviation, setDeviation] = useState(null);
  const [activeView, setActiveView] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [processType, setProcessType] = useState("");

  const userRole = (localStorage.getItem("user_role") || "").toLowerCase();
  const canReview = ["reviewer", "counsel"].includes(userRole);

  const fetchDocuments = async () => {
    if (!token()) {
      setDocuments([]);
      setFilename("");
      localStorage.removeItem("filename");
      setMessage("Please login first to view your documents.");
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
        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (!response.ok) {
        setMessage(data.detail || data.message || "Unable to load documents.");
        return;
      }

      setDocuments(data.documents || []);
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const uploadDocument = async () => {
    if (!file) return setMessage("Please select a PDF file first.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setMessage("");
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
        setMessage(
          data.detail || data.message || "Unable to upload the document.",
        );
        return;
      }

      setFilename(data.filename);
      localStorage.setItem("filename", data.filename);
      setMessage(data.message || "Document uploaded successfully.");
      await fetchDocuments();
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const indexDocument = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage("Please select a document first.");
      return;
    }

    if (!token()) {
      setMessage(
        "You are not logged in. Please login first to index this document.",
      );
      return;
    }

    try {
      setLoading(true);
      setProcessType("index");
      setMessage("Indexing process is running... Please wait.");
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

        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (response.status === 403) {
        setMessage("You do not have permission to index this document.");
        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail || data.message || "Unable to index the document.",
        );
        return;
      }

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);

      setMessage(
        `${data.message} - ${data.number_of_chunks} clauses indexed. Reloading the page...`,
      );

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const reviewDocument = async (selectedFilename) => {
    if (!selectedFilename) return setMessage("Please select a document first.");
    if (!token())
      return setMessage(
        "You are not logged in. Please login first to view this review.",
      );

    try {
      setLoading(true);
      setProcessType("review");
      setMessage("Review process is running... Please wait.");

      const response = await fetch(
        `${API_URL}/documents/review/${encodeURIComponent(selectedFilename)}`,
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      const data = await response.json();

      if (response.status === 401) {
        ["access_token", "username", "user_role"].forEach((k) =>
          localStorage.removeItem(k),
        );
        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (response.status === 404)
        return setMessage("No saved review found for this document.");
      if (response.status === 403)
        return setMessage("You do not have permission to view this review.");
      if (!response.ok)
        return setMessage(
          data.detail || data.message || "Unable to load the review.",
        );

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);
      setReview(data.review);
      setDeviation(null);
      setActiveView("review");
      setMessage(data.message || "Saved review loaded successfully.");
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const runReviewIfNeeded = async (selectedFilename) => {
    if (!selectedFilename) return setMessage("Please select a document first.");
    if (!token())
      return setMessage(
        "You are not logged in. Please login first to review this document.",
      );

    try {
      setLoading(true);
      setProcessType("review");
      setMessage("Review process is running... Please wait.");

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
        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (response.status === 403)
        return setMessage(
          "You do not have permission to review this document.",
        );
      if (!response.ok)
        return setMessage(
          data.detail || data.message || "Unable to review this document.",
        );

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);
      setReview(data.review);
      setDeviation(null);
      setActiveView("review");

      const msg = data.cached
        ? "Existing review loaded. The AI workflow was not executed again."
        : "Review completed successfully. Reloading the page...";
      setMessage(msg);

      if (!data.cached) setTimeout(() => window.location.reload(), 700);
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const deviationDocument = async (selectedFilename) => {
    if (!selectedFilename) return setMessage("Please select a document first.");
    if (!token())
      return setMessage(
        "You are not logged in. Please login first to view deviation analysis.",
      );

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/documents/deviation/${encodeURIComponent(selectedFilename)}`,
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      const data = await response.json();

      if (response.status === 404) {
        setDeviation(null);
        return setMessage(
          "No saved deviation analysis found. Click 'Analyze Deviation' to create it.",
        );
      }

      if (response.status === 401) {
        ["access_token", "username", "user_role"].forEach((k) =>
          localStorage.removeItem(k),
        );
        return setMessage("Your session has expired. Please login again.");
      }

      if (!response.ok) {
        return setMessage(
          data.detail || data.message || "Unable to load deviation analysis.",
        );
      }

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);
      setDeviation(data);
      setReview(null);
      setActiveView("deviation");
      setMessage("Saved deviation analysis loaded successfully.");
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
      setProcessType("");
    }
  };

  const runDeviationIfNeeded = async (selectedFilename) => {
    if (!selectedFilename) return setMessage("Please select a document first.");
    if (!token())
      return setMessage(
        "You are not logged in. Please login first to analyze deviation.",
      );

    try {
      setLoading(true);
      setProcessType("deviation");
      setMessage("Deviation analysis is running... Please wait.");

      const response = await fetch(
        `${API_URL}/documents/deviation/${encodeURIComponent(selectedFilename)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}` },
        },
      );
      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail || data.message || "Unable to analyze deviation.",
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
      setMessage(msg);

      if (!data.cached) setTimeout(() => window.location.reload(), 700);
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
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
    setMessage(`Selected document: ${document.original_filename}`);
  };

  const submitApproval = async (decision) => {
    if (!filename) return setMessage("Please select a document first.");
    if (!token())
      return setMessage(
        "You are not logged in. Please login first to approve or reject this document.",
      );

    try {
      setLoading(true);
      setMessage("");

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
        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (response.status === 403) {
        setMessage(
          "You do not have permission to approve or reject this document.",
        );
        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail ||
            data.message ||
            "Unable to process the approval request.",
        );
        return;
      }

      setMessage(data.message || "Approval decision submitted successfully.");
      setReview(null);
      setActiveView(null);
      await fetchDocuments();
    } catch {
      setMessage(
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
                ? "Review in Progress"
                : processType === "deviation"
                  ? "Deviation Analysis in Progress"
                  : "Indexing in Progress"}
            </h5>
            <p className="text-muted mb-0">
              The AI is processing the document. Please wait...
            </p>
          </div>
        </div>
      )}

      <div className="dashboard">
        <div className="welcome">
          <h2>Documents</h2>
          <p>Upload, index, review, and manage your legal contracts.</p>
        </div>

        <div className="content-card mt-4">
          <h5>Upload Contract</h5>
          <input
            type="file"
            accept=".pdf"
            className="form-control mt-3"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setMessage("");
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
              {loading ? "Processing..." : "Upload Contract"}
            </button>

            {file && (
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setFile(null);
                  setMessage("File selection cleared.");
                }}
                disabled={loading}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="content-card mt-4">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">My Documents</h5>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={fetchDocuments}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {documents.length === 0 ? (
            <p className="mt-4 text-muted">No documents found.</p>
          ) : (
            <div className="table-responsive mt-4">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td>
                        <strong>{document.original_filename}</strong>
                        <div className="small text-muted">
                          Stored: {document.stored_filename}
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
                        <div className="d-flex gap-2 flex-wrap align-items-center">
                          {canAct && (
                            <ActionButton
                              style={buttonStyles.select}
                              onClick={() => selectDocument(document)}
                              disabled={loading}
                            >
                              Select
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
                              Upload Again
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
                                Review Contract
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
                                Analyze Deviation
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
                                  View Review
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
                                  View Deviation
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
                                  Analyze Deviation
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
              Selected document: <strong>{filename}</strong>
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
              Clear Selection
            </button>
          </div>
        )}

        {message && (
          <div className="alert alert-light border mt-4">{message}</div>
        )}

        {activeView === "review" && review && (
          <div className="content-card mt-4">
            <h5>Contract Review</h5>

            {review.risks?.length > 0 ? (
              <div className="mt-3">
                {review.risks.map((item, index) => (
                  <div className="border rounded p-3 mb-3" key={index}>
                    <h6>{item.title}</h6>
                    <p>
                      <strong>Risk:</strong> {item.risk?.risk_level}
                    </p>
                    <p>
                      <strong>Reason:</strong> {item.risk?.reason}
                    </p>
                    <p>
                      <strong>Evidence:</strong> {item.risk?.evidence}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-3">No risk issues found.</p>
            )}

            {review.memo && (
              <div className="content-card mt-4">
                <h5 className="mb-3">Risk Memo</h5>

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
                      Approve
                    </button>

                    <button
                      className="btn btn-sm"
                      style={buttonStyles.reject}
                      onClick={() => submitApproval("rejected")}
                      disabled={loading}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === "deviation" && deviation && (
          <div className="content-card mt-4">
            <h5>Deviation Analysis</h5>

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
                        <h6 className="mb-2">Playbook Rule</h6>

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
                        <strong>Deviation:</strong> {item.deviation}
                      </p>
                    )}

                    {item.deviation && typeof item.deviation === "object" && (
                      <>
                        <p>
                          <strong>Deviation:</strong>{" "}
                          {item.deviation.deviation ? "Yes" : "No"}
                        </p>

                        {item.deviation.reason && (
                          <p>
                            <strong>Reason:</strong> {item.deviation.reason}
                          </p>
                        )}
                      </>
                    )}

                    {!item.rule && item.reason && (
                      <p>
                        <strong>Result:</strong> {item.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-3">No deviation results found.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
