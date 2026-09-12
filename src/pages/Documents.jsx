import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function Documents() {
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");

  const [documents, setDocuments] = useState([]);
  const [review, setReview] = useState(null);
  const [deviation, setDeviation] = useState(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setDocuments([]);
      setFilename("");
      localStorage.removeItem("filename");
      setMessage("Please login first to view your documents.");
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
    if (!file) {
      setMessage("Please select a PDF file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setMessage("");
      setReview(null);
      setDeviation(null);

      const token = localStorage.getItem("access_token");

      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    }
  };

  const indexDocument = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage("Please select a document first.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        "You are not logged in. Please login first to index this document.",
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

      setMessage(`${data.message} - ${data.number_of_chunks} clauses indexed.`);

      await fetchDocuments();
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const reviewDocument = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage("Please select a document first.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        "You are not logged in. Please login first to view this review.",
      );
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/documents/review/${encodeURIComponent(selectedFilename)}`,
        {
          method: "GET",
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
        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (response.status === 404) {
        setMessage("No saved review found for this document.");
        return;
      }

      if (response.status === 403) {
        setMessage("You do not have permission to view this review.");
        return;
      }

      if (!response.ok) {
        setMessage(data.detail || data.message || "Unable to load the review.");
        return;
      }

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);
      setReview(data.review);
      setMessage(
        data.message ||
          "Saved review loaded successfully. No new AI review was executed.",
      );
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const runReviewIfNeeded = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage("Please select a document first.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        "You are not logged in. Please login first to review this document.",
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
        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (response.status === 403) {
        setMessage("You do not have permission to review this document.");
        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail || data.message || "Unable to review this document.",
        );
        return;
      }

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);
      setReview(data.review);

      setMessage(
        data.cached
          ? "Existing review loaded. The AI workflow was not executed again."
          : "New review completed and saved successfully.",
      );

      await fetchDocuments();
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const deviationDocument = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage("Please select a document first.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        "You are not logged in. Please login first to view deviation analysis.",
      );
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      // VIEW = read only. It never calls Gemini and never creates new data.
      const response = await fetch(
        `${API_URL}/documents/deviation/${encodeURIComponent(selectedFilename)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.status === 404) {
        setDeviation(null);
        setMessage(
          "No saved deviation analysis found. Click 'Analyze Deviation' to create it.",
        );
        return;
      }

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("user_role");
        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail || data.message || "Unable to load deviation analysis.",
        );
        return;
      }

      setFilename(selectedFilename);
      localStorage.setItem("filename", selectedFilename);
      setDeviation(data);
      setMessage("Saved deviation analysis loaded successfully.");
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const runDeviationIfNeeded = async (selectedFilename) => {
    if (!selectedFilename) {
      setMessage("Please select a document first.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        "You are not logged in. Please login first to analyze deviation.",
      );
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/documents/deviation/${encodeURIComponent(selectedFilename)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

      setMessage(
        data.cached
          ? "Existing deviation analysis loaded. No new AI analysis was executed."
          : "Deviation analysis completed and saved successfully.",
      );
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectDocument = (document) => {
    setFilename(document.stored_filename);

    localStorage.setItem("filename", document.stored_filename);

    setReview(null);
    setDeviation(null);

    setMessage(`Selected document: ${document.original_filename}`);
  };

  const submitApproval = async (decision) => {
    if (!filename) {
      setMessage("Please select a document first.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setMessage(
        "You are not logged in. Please login first to approve or reject this document.",
      );
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
            Authorization: `Bearer ${token}`,
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
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("user_role");

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

      await fetchDocuments();
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
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
        return "bg-warning text-dark";

      case "failed":
        return "bg-danger";

      default:
        return "bg-secondary";
    }
  };

  return (
    <div className="dashboard">
      <div className="welcome">
        <h2>Documents</h2>

        <p>Upload, index, review, and manage your legal contracts.</p>
      </div>

      {/* Upload */}
      <div className="content-card mt-4">
        <h5>Upload Contract</h5>

        <input
          type="file"
          accept=".pdf"
          className="form-control mt-3"
          onChange={(event) => {
            setFile(event.target.files[0]);
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

      {/* All Documents from Database */}
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
                        <button
                          className="btn btn-sm btn-outline-dark px-3"
                          onClick={() => selectDocument(document)}
                          disabled={loading}
                        >
                          Select
                        </button>

                        {document.status === "failed" && (
                          <button
                            className="btn btn-sm btn-outline-secondary px-3"
                            onClick={() =>
                              indexDocument(document.stored_filename)
                            }
                            disabled={loading}
                          >
                            Retry Index
                          </button>
                        )}

                        {document.status === "indexed" && (
                          <>
                            <button
                              className="btn btn-sm btn-success px-3"
                              onClick={() =>
                                runReviewIfNeeded(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              Review Contract
                            </button>

                            <button
                              className="btn btn-sm btn-outline-secondary px-3"
                              onClick={() =>
                                runDeviationIfNeeded(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              Analyze Deviation
                            </button>
                          </>
                        )}

                        {(document.status === "reviewed" ||
                          document.status === "approved" ||
                          document.status === "rejected") && (
                          <>
                            <button
                              className="btn btn-sm btn-outline-success px-3"
                              onClick={() =>
                                reviewDocument(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              View Review
                            </button>

                            <button
                              className="btn btn-sm btn-outline-secondary px-3"
                              onClick={() =>
                                deviationDocument(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              View Deviation
                            </button>

                            <button
                              className="btn btn-sm btn-outline-primary px-3"
                              onClick={() =>
                                runDeviationIfNeeded(document.stored_filename)
                              }
                              disabled={loading}
                            >
                              Analyze Deviation
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

      {/* Selected Document */}
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
            }}
            disabled={loading}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="alert alert-light border mt-4">{message}</div>
      )}

      {/* Review Result */}
      {review && (
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
            <div className="alert alert-secondary mt-4">
              <h6>Risk Memo</h6>

              <p className="mb-0">{review.memo}</p>

              <div className="d-flex gap-2 mt-4">
                <button
                  className="btn btn-success"
                  onClick={() => submitApproval("approved")}
                  disabled={loading}
                >
                  Approve
                </button>

                <button
                  className="btn btn-danger"
                  onClick={() => submitApproval("rejected")}
                  disabled={loading}
                >
                  Reject
                </button>
              </div>

              <p className="small text-muted mt-3 mb-0">
                A Counsel can change the current decision later. Each decision
                is stored as a separate approval record.
              </p>
            </div>
          )}
        </div>
      )}

      {deviation && (
        <div className="content-card mt-4">
          <h5>Deviation Analysis</h5>

          {deviation.results?.length > 0 ? (
            <div className="mt-3">
              {deviation.results.map((item, index) => (
                <div className="border rounded p-3 mb-3" key={index}>
                  <h6>{item.title}</h6>

                  {item.rule && (
                    <p>
                      <strong>Playbook Rule:</strong>{" "}
                      {typeof item.rule === "string"
                        ? item.rule
                        : JSON.stringify(item.rule)}
                    </p>
                  )}

                  {item.deviation && (
                    <>
                      <p>
                        <strong>Deviation:</strong>{" "}
                        {typeof item.deviation === "string"
                          ? item.deviation
                          : item.deviation.deviation
                            ? "Yes"
                            : "No"}
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
  );
}
