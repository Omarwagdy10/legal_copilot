import { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext();

const translations = {
  en: {
    dashboard: "Dashboard",
    documents: "Documents",
    askCopilot: "Ask Copilot",
    deviation: "Deviation",
    logout: "Logout",
    welcome: "Welcome to Legal Copilot ⚖️",
    reviewContracts:
      "Review contracts, identify risks, and generate evidence-based legal memos.",
    uploadContract: "Upload Contract",
    myDocuments: "My Documents",
    select: "Select",
    index: "Index",
    review: "Review",
    delete: "Delete",
    refresh: "Refresh",
    status: "Status",
    created: "Created",
    updated: "Updated",
    approve: "Approve",
    reject: "Reject",
    riskMemo: "Risk Memo",
  },

  ar: {
    dashboard: "لوحة التحكم",
    documents: "المستندات",
    askCopilot: "اسأل المساعد",
    deviation: "تحليل الانحراف",
    logout: "تسجيل الخروج",
    welcome: "مرحبًا بك في Legal Copilot ⚖️",
    reviewContracts:
      "راجع العقود، وحدد المخاطر، وأنشئ مذكرات قانونية مدعومة بالأدلة.",
    uploadContract: "رفع عقد",
    myDocuments: "مستنداتي",
    select: "اختيار",
    index: "فهرسة",
    review: "مراجعة",
    delete: "حذف",
    refresh: "تحديث",
    status: "الحالة",
    created: "تاريخ الإنشاء",
    updated: "آخر تحديث",
    approve: "موافقة",
    reject: "رفض",
    riskMemo: "مذكرة المخاطر",
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en",
  );

  useEffect(() => {
    localStorage.setItem("language", language);

    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage((current) => (current === "en" ? "ar" : "en"));
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
