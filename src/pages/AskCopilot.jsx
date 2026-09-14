import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const API_URL = "http://127.0.0.1:8000";

export default function AskCopilot() {
  const { t, language, setLanguage } = useLanguage();

  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState([]);
  const [selectedFilename, setSelectedFilename] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const isArabic = language === "ar";

  const auth = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  });

  const tr = (en, ar) => (isArabic ? ar : en);

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
        setMessage(
          tr(
            "Your session has expired. Please login again.",
            "انتهت صلاحية الجلسة. من فضلك قم بتسجيل الدخول مرة أخرى.",
          ),
        );
        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail ||
            data.message ||
            tr("Unable to load documents.", "تعذر تحميل المستندات."),
        );
        return;
      }

      const indexedDocuments = (data.documents || []).filter(
        (document) =>
          document.status === "indexed" ||
          document.status === "reviewed" ||
          document.status === "approved" ||
          document.status === "rejected",
      );

      setDocuments(indexedDocuments);

      const savedFilename = localStorage.getItem("ask_filename");
      const savedExists = indexedDocuments.some(
        (document) => document.stored_filename === savedFilename,
      );

      if (savedExists) {
        setSelectedFilename(savedFilename);
      } else if (indexedDocuments.length === 1) {
        setSelectedFilename(indexedDocuments[0].stored_filename);
      }
    } catch {
      setMessage(
        tr(
          "Unable to connect to the server. Please make sure the backend is running.",
          "تعذر الاتصال بالخادم. تأكد من تشغيل الـ backend.",
        ),
      );
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const ask = async () => {
    if (!selectedFilename) {
      setMessage(
        tr("Please select a document first.", "من فضلك اختر مستندًا أولاً."),
      );
      return;
    }

    if (!query.trim()) {
      setMessage(tr("Please enter a question.", "من فضلك اكتب سؤالك."));
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setAnswer("");
      setSources([]);

      localStorage.setItem("ask_filename", selectedFilename);

      const params = new URLSearchParams({
        query: query.trim(),
        filename: selectedFilename,
      });

      const response = await fetch(`${API_URL}/ask?${params.toString()}`, {
        headers: auth(),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.clear();
        setMessage(
          tr(
            "Your session has expired. Please login again.",
            "انتهت صلاحية الجلسة. من فضلك قم بتسجيل الدخول مرة أخرى.",
          ),
        );
        return;
      }

      if (!response.ok) {
        setMessage(
          data.detail ||
            tr("Unable to get an answer.", "تعذر الحصول على إجابة."),
        );
        return;
      }

      setAnswer(data.answer || "");
      setSources(data.sources || []);
    } catch {
      setMessage(
        tr("Unable to connect to the server.", "تعذر الاتصال بالخادم."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard" dir={isArabic ? "rtl" : "ltr"}>
      {/* Language */}
      <div className="d-flex justify-content-end gap-2 mb-3">
        <button
          type="button"
          className={`btn ${
            language === "en" ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => setLanguage("en")}
        >
          English
        </button>

        <button
          type="button"
          className={`btn ${
            language === "ar" ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => setLanguage("ar")}
        >
          العربية
        </button>
      </div>

      {/* Header */}
      <div className="welcome">
        <h2>{tr("Ask Copilot", "اسأل المساعد")}</h2>

        <p>
          {tr(
            "Ask questions in Arabic or English and get cited answers from the selected document.",
            "اسأل بالعربية أو الإنجليزية واحصل على إجابات موثقة من المستند المحدد.",
          )}
        </p>
      </div>

      {/* Question Card */}
      <div className="content-card mt-4">
        <label className="form-label fw-bold">
          {tr("Select Document", "اختر المستند")}
        </label>

        <select
          className="form-select"
          value={selectedFilename}
          onChange={(e) => {
            setSelectedFilename(e.target.value);
            setAnswer("");
            setSources([]);
            setMessage("");
          }}
          disabled={documentsLoading || loading}
        >
          <option value="">
            {documentsLoading
              ? tr("Loading documents...", "جاري تحميل المستندات...")
              : tr("Select a PDF", "اختر ملف PDF")}
          </option>

          {documents.map((document) => (
            <option key={document.id} value={document.stored_filename}>
              {document.original_filename}
            </option>
          ))}
        </select>

        <small className="text-muted d-block mt-2">
          {tr(
            "The AI will search only inside this selected document.",
            "سيبحث الذكاء الاصطناعي داخل المستند المحدد فقط.",
          )}
        </small>

        <label className="form-label fw-bold mt-4">
          {tr("Your Question", "سؤالك")}
        </label>

        <textarea
          className="form-control"
          rows="4"
          dir={isArabic ? "rtl" : "ltr"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr(
            "Ask about the selected contract...",
            "اسأل عن العقد المحدد...",
          )}
        />

        <button
          className="btn btn-primary mt-3"
          onClick={ask}
          disabled={loading}
        >
          {loading
            ? tr("Thinking...", "جاري التفكير...")
            : tr("Ask Copilot", "اسأل المساعد")}
        </button>

        {message && <div className="alert alert-danger mt-3">{message}</div>}
      </div>

      {/* Answer */}
      {answer && (
        <div className="content-card mt-4">
          <h5>{tr("Answer", "الإجابة")}</h5>

          <p className="mt-3" dir={isArabic ? "rtl" : "ltr"}>
            {answer}
          </p>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="content-card mt-4">
          <h5>{tr("Sources", "المصادر")}</h5>

          {sources.map((source, index) => (
            <div className="border rounded p-3 mb-3" key={source.chunk_id}>
              <strong>
                {tr("Source", "المصدر")} {index + 1}
              </strong>

              <p className="mb-1 mt-2">
                <strong>{tr("File:", "الملف:")}</strong> {source.filename}
              </p>

              <p className="mb-1">
                <strong>{tr("Clause:", "البند:")}</strong>{" "}
                {source.section || source.chunk_index}
              </p>

              <p className="mb-1">
                <strong>{tr("Fusion score:", "درجة الدليل:")}</strong>{" "}
                {Number(source.fusion_score).toFixed(3)}
              </p>

              <p
                className="mb-0"
                dir={source.language === "ar" ? "rtl" : "ltr"}
              >
                {source.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
