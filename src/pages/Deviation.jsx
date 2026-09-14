import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function Deviation() {
  const [documents, setDocuments] = useState([]);
  const [selectedFilename, setSelectedFilename] = useState("");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const auth = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  });

  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true);

      const response = await fetch(`${API_URL}/documents`, {
        headers: auth(),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.clear();
        setDocuments([]);
        setSelectedFilename("");
        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (!response.ok) {
        setMessage(data.detail || data.message || "Unable to load documents.");
        return;
      }

      // Only indexed/reviewed documents can be analyzed
      const availableDocuments = (data.documents || []).filter(
        (document) =>
          document.status === "indexed" ||
          document.status === "reviewed" ||
          document.status === "approved" ||
          document.status === "rejected",
      );

      setDocuments(availableDocuments);

      // Restore previous selection
      const savedFilename = localStorage.getItem("deviation_filename");

      const savedExists = availableDocuments.some(
        (document) => document.stored_filename === savedFilename,
      );

      if (savedExists) {
        setSelectedFilename(savedFilename);
      } else if (availableDocuments.length === 1) {
        setSelectedFilename(availableDocuments[0].stored_filename);
      }
    } catch {
      setMessage(
        "Unable to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const run = async () => {
    if (!selectedFilename) {
      setMessage("Please select a document first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setResults([]);

      localStorage.setItem("deviation_filename", selectedFilename);

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

      if (response.status === 401) {
        localStorage.clear();
        setMessage("Your session has expired. Please login again.");
        return;
      }

      if (!response.ok) {
        setMessage(data.detail || "Deviation analysis failed.");
        return;
      }

      setResults(data.results || []);

      setMessage(
        data.cached
          ? "Existing deviation analysis loaded."
          : "Deviation analysis completed successfully.",
      );
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="welcome">
        <h2>Deviation Analysis</h2>

        <p>Compare contract clauses against the bilingual playbook.</p>
      </div>

      {/* Select Document */}
      <div className="content-card mt-4">
        <label className="form-label fw-bold">Select Document</label>

        <select
          className="form-select"
          value={selectedFilename}
          onChange={(e) => {
            setSelectedFilename(e.target.value);
            setResults([]);
            setMessage("");

            localStorage.setItem("deviation_filename", e.target.value);
          }}
          disabled={documentsLoading || loading}
        >
          <option value="">
            {documentsLoading ? "Loading documents..." : "Select a PDF"}
          </option>

          {documents.map((document) => (
            <option key={document.id} value={document.stored_filename}>
              {document.original_filename}
            </option>
          ))}
        </select>

        <small className="text-muted d-block mt-2">
          The deviation analysis will run only on the selected document.
        </small>

        <button
          className="btn btn-primary mt-3"
          onClick={run}
          disabled={loading || !selectedFilename}
        >
          {loading ? "Analyzing..." : "Run Deviation Analysis"}
        </button>

        {message && (
          <div className="alert alert-light border mt-3">{message}</div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="content-card mt-4">
          <h5>Deviation Results</h5>

          {results.map((item, index) => (
            <div className="border rounded p-3 mb-3" key={index}>
              <h6>{item.title}</h6>

              {item.text && <p>{item.text}</p>}

              {item.rule && (
                <div className="alert alert-info">
                  <strong>Playbook Rule:</strong> {item.rule.expected}
                </div>
              )}

              <p>
                <strong>Deviation:</strong>{" "}
                {item.deviation === null
                  ? "No matching rule"
                  : item.deviation?.deviation
                    ? "Yes"
                    : "No"}
              </p>

              {item.deviation?.reason && (
                <p>
                  <strong>Reason:</strong> {item.deviation.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
