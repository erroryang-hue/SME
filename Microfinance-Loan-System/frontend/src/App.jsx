import { useState, useEffect, useRef } from "react";
import API from "./api/api";
import "./index.css";
import AuthPage from "./components/AuthPage";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Cell
} from "recharts";

/* ── Small reusable components ───────────────────────────── */
const SectionHeader = ({ title, icon }) => (
  <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-2">
    <div className="w-10 h-10 rounded-xl bg-[#e6f4f1] text-[#044335] flex items-center justify-center shadow-sm shrink-0">{icon}</div>
    <h2 className="text-lg font-bold text-gray-800 tracking-tight">{title}</h2>
  </div>
);

const ProgressCircle = ({ score, total = 100, label, colorClass, displayValue }) => {
  const radius = 54, strokeWidth = 9, nr = radius - strokeWidth;
  const circ = nr * 2 * Math.PI;
  const offset = circ - (score / total) * circ;
  return (
    <div className="flex flex-col items-center justify-center my-3 relative">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle stroke="#f1f5f9" fill="transparent" strokeWidth={strokeWidth} r={nr} cx={radius} cy={radius} />
        <circle className={`${colorClass} transition-all duration-500`} fill="transparent" strokeWidth={strokeWidth}
          strokeDasharray={`${circ} ${circ}`} style={{ strokeDashoffset: score === 0 ? circ : offset }}
          r={nr} cx={radius} cy={radius} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <span className="text-xl font-black text-gray-800">{displayValue}</span>
        {label && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 px-1 w-20">{label}</p>}
      </div>
    </div>
  );
};

const Badge = ({ text, color }) => {
  const map = {
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    HIGH: "bg-red-50 text-red-700 border-red-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${map[text] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {text}
    </span>
  );
};

/* ── Main App ────────────────────────────────────────────── */
function App() {
  // ── Auth ──────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState(() => {
    const s = localStorage.getItem("mg_user");
    return s ? JSON.parse(s) : null;
  });

  const handleAuthSuccess = (user) => {
    setAuthUser(user);
    localStorage.setItem("mg_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    localStorage.removeItem("mg_token");
    localStorage.removeItem("mg_user");
    setAuthUser(null);
  };

  // ── Shared state ──────────────────────────────────────────
  const [allLenders, setAllLenders] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [myBorrowerProfile, setMyBorrowerProfile] = useState(null);
  const [myLenderProfile, setMyLenderProfile] = useState(null);
  const [borrowerRequests, setBorrowerRequests] = useState([]);
  const [lenderRequests, setLenderRequests] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [requestStatus, setRequestStatus] = useState({});

  // ── Borrower form state ───────────────────────────────────
  const [gstNumber, setGstNumber] = useState("");
  const [revenueData, setRevenueData] = useState(null);
  const [manualRevenue, setManualRevenue] = useState(Array(12).fill(""));
  const [manualForecast, setManualForecast] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [trustScore, setTrustScore] = useState(null);
  const [lenders, setLenders] = useState(null);
  const [bankPDF, setBankPDF] = useState(null);
  const [expenseCSV, setExpenseCSV] = useState(null);
  const [businessDetails, setBusinessDetails] = useState({ businessName: "", businessType: "", customBusinessType: "", years: "", location: "" });
  const [loanDetails, setLoanDetails] = useState({ loanAmount: "", tenure: "", maxEmi: "", emergency: "" });
  const [creditHistory, setCreditHistory] = useState({ previousLoans: "", defaults: "", msme: "" });

  // ── Lender portal state ───────────────────────────────────
  const [lenderForm, setLenderForm] = useState({ lenderName: "", organization: "", availableFund: "", interestRate: "", minTrustScore: "", maxRisk: "" });
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [borrowerAnalysis, setBorrowerAnalysis] = useState({});   // { [id]: { forecast, risk, trust } }
  const [analyzingId, setAnalyzingId] = useState(null);
  const [topBorrowers, setTopBorrowers] = useState([]);
  const [topBorrowersLoading, setTopBorrowersLoading] = useState(false);
  const [lenderRepaymentView, setLenderRepaymentView] = useState(null);

  // ── Fetch helpers ─────────────────────────────────────────
  const fetchLenders = async () => {
    try { const r = await API.get("/get-lenders"); setAllLenders(r.data); } catch (e) { console.error(e); }
  };
  const fetchBorrowers = async () => {
    try { const r = await API.get("/get-borrowers"); setBorrowers(r.data); } catch (e) { console.error(e); }
  };
  const fetchMyProfile = async () => {
    if (!authUser) return;
    try {
      if (authUser.role === "borrower") { const r = await API.get("/borrower/me"); setMyBorrowerProfile(r.data); }
      else if (authUser.role === "lender") { const r = await API.get("/lender/me"); setMyLenderProfile(r.data); }
    } catch (e) { console.error(e); }
  };
  const fetchMyRequests = async () => {
    if (!authUser) return;
    try {
      if (authUser.role === "borrower") { const r = await API.get("/borrower/requests"); setBorrowerRequests(r.data); }
      else if (authUser.role === "lender") { const r = await API.get("/lender/requests"); setLenderRequests(r.data); }
    } catch (e) { console.error(e); }
  };
  const fetchRepayments = async () => {
    if (!authUser) return;
    try {
      if (authUser.role === "borrower") { const r = await API.get("/borrower/repayments"); setRepayments(r.data); }
    } catch (e) { console.error(e); }
  };
  const fetchTopBorrowers = async () => {
    setTopBorrowersLoading(true);
    try { const r = await API.get("/lender/top-borrowers"); setTopBorrowers(r.data); }
    catch (e) { console.error(e); }
    finally { setTopBorrowersLoading(false); }
  };

  useEffect(() => {
    if (!authUser) return;
    fetchLenders();
    fetchBorrowers();
    fetchMyProfile();
    fetchMyRequests();
    fetchRepayments();
    if (authUser.role === "lender") fetchTopBorrowers();
  }, [authUser]);

  // Poll top borrowers every 30s for lenders so it stays fresh
  useEffect(() => {
    if (!authUser || authUser.role !== "lender") return;
    const interval = setInterval(fetchTopBorrowers, 30000);
    return () => clearInterval(interval);
  }, [authUser]);

  // ── Borrower actions ──────────────────────────────────────
  const fetchGSTRevenue = async () => {
    try {
      const r = await API.get(`/get-gst-revenue/${gstNumber}`);
      if (r.data.error) { alert(r.data.error); return; }
      setRevenueData(r.data);
    } catch (e) { alert("GST fetch failed"); }
  };

  const forecastRevenue = async () => {
    try { const r = await API.post("/forecast-revenue", revenueData); setForecastData(r.data); }
    catch (e) { alert("Forecast failed"); }
  };

  const forecastManualRevenue = async () => {
    try {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const payload = { Company_Name: businessDetails.businessName || "Manual" };
      months.forEach((m, i) => { payload[m] = Number(manualRevenue[i]) || 0; });
      const r = await API.post("/forecast-revenue", payload);
      setManualForecast(r.data);
    } catch (e) { alert("Manual forecast failed"); }
  };

  const submitBorrower = async () => {
    try {
      const payload = {
        business_name: businessDetails.businessName,
        business_type: businessDetails.businessType === "Others" ? businessDetails.customBusinessType : businessDetails.businessType,
        years_in_operation: Number(businessDetails.years),
        location: businessDetails.location,
        gst_number: gstNumber,
        loan_amount: Number(loanDetails.loanAmount),
        loan_tenure: Number(loanDetails.tenure),
        max_emi: Number(loanDetails.maxEmi),
        emergency_request: loanDetails.emergency === "Yes",
        previous_loans: creditHistory.previousLoans === "Yes",
        defaults_history: creditHistory.defaults === "Yes",
        registered_msme: creditHistory.msme === "Yes"
      };
      let r;
      if (myBorrowerProfile) {
        r = await API.put("/update-borrower", payload);
      } else {
        r = await API.post("/add-borrower", payload);
      }
      alert(r.data.message);
      fetchBorrowers(); fetchMyProfile();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to save borrower");
    }
  };

  const deleteBorrower = async (id) => {
    try { await API.delete(`/delete-borrower/${id}`); fetchBorrowers(); setMyBorrowerProfile(null); fetchMyProfile(); }
    catch (e) { console.error(e); }
  };

  const requestLoan = async (lenderId) => {
    setRequestStatus(p => ({ ...p, [lenderId]: "loading" }));
    try {
      await API.post("/request-lender", { lender_id: lenderId, borrower_name: authUser?.name || "Borrower" });
      setRequestStatus(p => ({ ...p, [lenderId]: "success" }));
      fetchMyRequests();
    } catch (err) {
      setRequestStatus(p => ({ ...p, [lenderId]: "error" }));
      alert(err.response?.data?.detail || "Request failed");
    }
  };

  const payEMI = async (repaymentId, emiNumber) => {
    try {
      await API.post(`/borrower/repayments/${repaymentId}/pay/${emiNumber}`);
      fetchRepayments();
    } catch (e) { alert(e.response?.data?.detail || "Payment failed"); }
  };

  // ── Lender actions ────────────────────────────────────────
  const addLender = async () => {
    try {
      const payload = {
        lender_name: lenderForm.lenderName,
        available_fund: Number(lenderForm.availableFund),
        interest_rate: Number(lenderForm.interestRate),
        maximum_risk: lenderForm.maxRisk,
        preferred_sectors: ""
      };
      const r = await API.post("/add-lender", payload);
      alert(r.data.message);
      fetchLenders(); fetchMyProfile(); fetchMyRequests(); fetchTopBorrowers();
    } catch (e) { alert(e.response?.data?.detail || "Failed to add lender"); }
  };

  const deleteLender = async (id) => {
    try { await API.delete(`/delete-lender/${id}`); fetchLenders(); setMyLenderProfile(null); fetchMyProfile(); }
    catch (e) { console.error(e); }
  };

  const analyzeBorrower = async (borrower) => {
    const id = borrower._id;
    setAnalyzingId(id);
    try {
      const r = await API.post(`/lender/analyze-borrower/${id}`);
      setBorrowerAnalysis(p => ({ ...p, [id]: r.data }));
    } catch (e) { alert("Analysis failed"); }
    finally { setAnalyzingId(null); }
  };

  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      await API.post(`/lender/requests/${requestId}/status`, { status: newStatus });
      fetchMyRequests();
    } catch (e) { alert("Failed to update status"); }
  };

  const viewLenderRepayments = async (borrowerEmail) => {
    try {
      const r = await API.get(`/lender/repayments/${borrowerEmail}`);
      setLenderRepaymentView(r.data);
    } catch (e) { alert("Failed to fetch repayments"); }
  };

  const getChartData = () => {
    if (!revenueData) return [];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const data = months.map(m => ({ month: m, Revenue: Number(revenueData[m]) || 0 }));
    if (forecastData) data.push({ month: "Next Month", Revenue: Number(forecastData.predicted_next_month_revenue) || 0 });
    return data;
  };

  // ── Auth gate ─────────────────────────────────────────────
  if (!authUser) return <AuthPage onAuthSuccess={handleAuthSuccess} />;

  /* ══════════════════════════════════════════════════════════
     TOP BAR
  ══════════════════════════════════════════════════════════ */
  const TopBar = () => (
    <header className="bg-white h-16 border-b border-gray-100 flex items-center justify-between px-8 z-10 shrink-0 shadow-sm">
      <div className="flex items-center gap-2">
        <svg className="w-8 h-8 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-9 8.2z" fill="currentColor" fillOpacity="0.15" />
          <path d="M9 22V12" />
        </svg>
        <span className="text-xl font-bold tracking-tight text-[#044335]">MicroGrow Exchange</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{authUser.role}</span>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-sm font-semibold text-gray-800">{authUser.name}</span>
        </div>
        <button onClick={handleLogout}
          className="text-xs font-semibold text-red-500 hover:text-red-700 transition px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50">
          Logout
        </button>
      </div>
    </header>
  );

  /* ══════════════════════════════════════════════════════════
     BORROWER PORTAL
  ══════════════════════════════════════════════════════════ */
  if (authUser.role === "borrower") {
    const approvedRequests = borrowerRequests.filter(r => r.status === "approved");

    return (
      <div className="bg-[#f8fafc] h-screen flex flex-col overflow-hidden font-sans antialiased">
        <TopBar />
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-7xl mx-auto w-full p-6 overflow-y-auto space-y-6">

            {/* Already registered banner */}
            {myBorrowerProfile && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900 text-sm">Profile Active — {myBorrowerProfile.business_name}</p>
                    <p className="text-xs text-emerald-700">Update your profile below or delete to start fresh.</p>
                  </div>
                </div>
                <button onClick={() => deleteBorrower(myBorrowerProfile._id)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
                  Delete Profile
                </button>
              </div>
            )}

            {/* SECTION 1 — Business Details — always show so profile can be updated */}
            <>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <SectionHeader title="Section 1 — Business Details"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                  />
                  <div className="grid grid-cols-2 gap-6">
                    {[["Business Name", "businessName", "text", "Acme Pvt Ltd"],
                      ["Business Type", "businessType", "select", ""],
                      ["Years in Operation", "years", "number", "e.g. 5"],
                      ["City, State", "location", "text", "Mumbai, Maharashtra"]
                    ].map(([label, key, type, ph]) => (
                      <div key={key}>
                        <label className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider block">{label}</label>
                        {type === "select" ? (
                          <select value={businessDetails[key]}
                            onChange={e => setBusinessDetails(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-[#044335]">
                            <option value="">Select Type</option>
                            {["Retail", "Manufacturing", "Services", "Agriculture", "Technology", "Healthcare", "Others"].map(t => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        ) : (
                          <input type={type} placeholder={ph} value={businessDetails[key]}
                            onChange={e => setBusinessDetails(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#044335]" />
                        )}
                      </div>
                    ))}
                    {businessDetails.businessType === "Others" && (
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider block">Specify Business Type</label>
                        <input type="text" placeholder="Describe your business type"
                          value={businessDetails.customBusinessType}
                          onChange={e => setBusinessDetails(p => ({ ...p, customBusinessType: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#044335]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 2 — GST */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <SectionHeader title="Section 2 — GST Revenue Verification"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                  />
                  <div className="flex gap-4">
                    <input type="text" placeholder="22AAAAA0000A1Z5" value={gstNumber} onChange={e => setGstNumber(e.target.value)}
                      className="flex-1 bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#044335]" />
                    <button onClick={fetchGSTRevenue}
                      className="bg-[#044335] hover:bg-[#065f46] text-white font-bold px-8 rounded-xl transition h-[50px]">
                      Fetch GST
                    </button>
                  </div>
                  {revenueData && (
                    <div className="mt-6">
                      <h3 className="text-base font-bold text-gray-800 mb-3">Verified Monthly Revenues</h3>
                      <div className="grid grid-cols-6 gap-3">
                        {Object.entries(revenueData).filter(([k]) => !["GSTIN","Company_Name","error"].includes(k)).map(([m, v]) => (
                          <div key={m} className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-emerald-800 uppercase">{m}</p>
                            <h4 className="font-extrabold text-gray-800 mt-1">₹{v}</h4>
                          </div>
                        ))}
                      </div>
                      <button onClick={forecastRevenue}
                        className="mt-4 bg-[#044335] hover:bg-[#065f46] text-white font-bold px-6 py-2.5 rounded-xl transition text-sm">
                        Run Revenue Forecast
                      </button>
                      {forecastData && (
                        <div className="mt-4 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-emerald-800">Predicted Next Month Revenue</p>
                          </div>
                          <p className="text-2xl font-black text-[#044335]">₹{forecastData.predicted_next_month_revenue?.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SECTION 3 — Manual Revenue */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <SectionHeader title="Section 3 — Manual Revenue Entry"
                      icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 00-2 2z" /></svg>}
                    />
                    <button onClick={forecastManualRevenue}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2 px-4 rounded-xl text-sm transition">
                      Forecast
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-4">
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                      <div key={i}>
                        <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase">{m}</label>
                        <input type="number" placeholder="0" value={manualRevenue[i]}
                          onChange={e => { const u = [...manualRevenue]; u[i] = e.target.value; setManualRevenue(u); }}
                          className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3 py-2 text-gray-800 text-sm focus:outline-none focus:border-[#044335]" />
                      </div>
                    ))}
                  </div>
                  {manualForecast && (
                    <div className="mt-4 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
                      <p className="text-sm font-semibold text-indigo-900">Manual Entry Forecast</p>
                      <p className="text-2xl font-black text-indigo-900">₹{manualForecast.predicted_next_month_revenue?.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* SECTION 4 — Expense & Loan */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <SectionHeader title="Section 4 — Expense & Loan Requirements"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                  <div className="grid grid-cols-2 gap-8 divide-x divide-gray-100">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase">Expense Analysis</h3>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">Upload Bank Statement PDF</label>
                        <input type="file" accept=".pdf" onChange={e => setBankPDF(e.target.files[0])}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#e6f4f1] file:text-[#044335] hover:file:bg-[#d5ebe7]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">Upload Expense CSV</label>
                        <input type="file" accept=".csv" onChange={e => setExpenseCSV(e.target.files[0])}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#e6f4f1] file:text-[#044335] hover:file:bg-[#d5ebe7]" />
                      </div>
                    </div>
                    <div className="pl-8 space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase">Loan Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[["Min Loan Needed","loanAmount","number","Amount"],["Tenure (Months)","tenure","number","e.g. 12"],["Max EMI Possible","maxEmi","number","Amount"]].map(([l,k,t,ph]) => (
                          <div key={k}>
                            <label className="text-[10px] font-bold text-gray-500 mb-1 block">{l}</label>
                            <input type={t} placeholder={ph} value={loanDetails[k]}
                              onChange={e => setLoanDetails(p => ({ ...p, [k]: e.target.value }))}
                              className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#044335]" />
                          </div>
                        ))}
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 mb-1 block">Emergency Request</label>
                          <select value={loanDetails.emergency} onChange={e => setLoanDetails(p => ({ ...p, emergency: e.target.value }))}
                            className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-[#044335]">
                            <option value="">Select</option>
                            <option>No</option>
                            <option>Yes</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 5 — Credit History */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <SectionHeader title="Section 5 — Credit History"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                  />
                  <div className="grid grid-cols-3 gap-6">
                    {[["Previous Loans","previousLoans"],["Any Defaults?","defaults"],["MSME Registered?","msme"]].map(([l,k]) => (
                      <div key={k}>
                        <label className="text-[10px] font-bold text-gray-500 mb-1 uppercase block">{l}</label>
                        <select value={creditHistory[k]} onChange={e => setCreditHistory(p => ({ ...p, [k]: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-[#044335]">
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-center pb-4">
                  <button onClick={submitBorrower}
                    className="bg-[#044335] hover:bg-[#065f46] text-white font-bold py-4 px-12 rounded-xl transition flex items-center gap-2 shadow-lg">
                    {myBorrowerProfile ? "Update Profile" : "Submit Application"}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>
            </>

            {/* SECTION 6 — Lender Marketplace */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <SectionHeader title="Section 6 — Lender Marketplace"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              />
              {allLenders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No lenders registered yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-5">
                  {allLenders.map((l) => {
                    const alreadyRequested = borrowerRequests.find(r => r.lender_id === l._id);
                    const rs = requestStatus[l._id];
                    return (
                      <div key={l._id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-gray-800">{l.lender_name}</h4>
                            <p className="text-xs text-gray-500">{l.organization}</p>
                          </div>
                          <Badge text={l.maximum_risk} />
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 mb-4">
                          <div className="flex justify-between"><span>Interest Rate</span><span className="font-bold text-gray-800">{l.interest_rate}%</span></div>
                          <div className="flex justify-between"><span>Available Fund</span><span className="font-bold text-gray-800">₹{Number(l.available_fund).toLocaleString()}</span></div>
                        </div>
                        {alreadyRequested ? (
                          <div className={`w-full text-center py-2.5 rounded-xl text-xs font-bold ${
                            alreadyRequested.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                            alreadyRequested.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"}`}>
                            {alreadyRequested.status.charAt(0).toUpperCase() + alreadyRequested.status.slice(1)}
                          </div>
                        ) : (
                          <button onClick={() => requestLoan(l._id)} disabled={rs === "loading"}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${
                              rs === "success" ? "bg-emerald-100 text-emerald-700" :
                              rs === "error" ? "bg-red-100 text-red-700" :
                              "bg-[#e6f4f1] hover:bg-[#d5ebe7] text-[#044335]"}`}>
                            {rs === "loading" ? "Requesting…" : rs === "success" ? "✓ Requested" : rs === "error" ? "Failed — Retry" : "Request Loan"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 7 — My Loan Requests */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <SectionHeader title="Section 7 — My Loan Requests"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
              />
              {borrowerRequests.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No loan requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {borrowerRequests.map(req => (
                    <div key={req._id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">Loan Request</p>
                        <p className="text-xs text-gray-500 mt-0.5">Amount: ₹{Number(req.loan_amount).toLocaleString()}</p>
                      </div>
                      <Badge text={req.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 8 — Repayment Tracking */}
            {repayments.length > 0 && (
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <SectionHeader title="Section 8 — Repayment Tracking"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                {repayments.map(rep => {
                  const paid = rep.schedule?.filter(e => e.paid).length || 0;
                  const total = rep.schedule?.length || 0;
                  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                  return (
                    <div key={rep._id} className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="font-bold text-gray-800">Loan — ₹{Number(rep.loan_amount).toLocaleString()}</h3>
                          <p className="text-xs text-gray-500">EMI: ₹{Number(rep.emi).toLocaleString()} · {rep.interest_rate}% p.a. · {rep.tenure} months</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#044335]">{paid}/{total} paid</p>
                          <div className="w-32 bg-gray-100 rounded-full h-1.5 mt-1">
                            <div className="bg-[#044335] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-1">
                        {rep.schedule?.map(emi => (
                          <div key={emi.emi_number} className={`p-3 rounded-xl border text-center ${emi.paid ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-100"}`}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">EMI {emi.emi_number}</p>
                            <p className="font-bold text-gray-800 text-sm mt-1">₹{Number(emi.amount).toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{emi.due_date}</p>
                            {emi.paid ? (
                              <span className="text-[10px] font-bold text-emerald-700">✓ Paid {emi.paid_date}</span>
                            ) : (
                              <button onClick={() => payEMI(rep._id, emi.emi_number)}
                                className="mt-1.5 text-[10px] font-bold text-[#044335] bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition">
                                Mark Paid
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
        <footer className="bg-white h-10 border-t border-gray-100 flex items-center justify-center text-xs text-gray-400 shrink-0">
          © 2024 MicroGrow Exchange · All rights reserved.
        </footer>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     LENDER PORTAL
  ══════════════════════════════════════════════════════════ */
  const riskColor = { LOW: "stroke-emerald-600", MEDIUM: "stroke-amber-500", HIGH: "stroke-red-500" };
  const riskScore = { LOW: 25, MEDIUM: 60, HIGH: 90 };

  return (
    <div className="bg-[#f8fafc] h-screen flex flex-col overflow-hidden font-sans antialiased">
      <TopBar />
      <div className="flex-1 overflow-hidden flex gap-0">

        {/* LEFT PANEL */}
        <div className="w-[60%] h-full overflow-y-auto p-6 space-y-6">

          {/* Lender Registration */}
          {!myLenderProfile ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <SectionHeader title="Register Lender Profile"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              />
              <div className="grid grid-cols-2 gap-5">
                {[["Lender Name","lenderName","text","Your Name"],["Available Fund (₹)","availableFund","number","e.g. 500000"],["Interest Rate (%)","interestRate","number","e.g. 12"]].map(([l,k,t,ph]) => (
                  <div key={k}>
                    <label className="text-[10px] font-bold text-gray-500 mb-1 uppercase block">{l}</label>
                    <input type={t} placeholder={ph} value={lenderForm[k]}
                      onChange={e => setLenderForm(p => ({ ...p, [k]: e.target.value }))}
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#044335]" />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 uppercase block">Maximum Risk Appetite</label>
                  <select value={lenderForm.maxRisk} onChange={e => setLenderForm(p => ({ ...p, maxRisk: e.target.value }))}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-[#044335]">
                    <option value="">Select Risk</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <button onClick={addLender}
                className="mt-6 bg-[#044335] hover:bg-[#065f46] text-white px-8 py-3.5 rounded-xl font-bold shadow-md transition">
                Register as Lender
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="font-bold text-emerald-900 text-sm">{myLenderProfile.lender_name}</p>
                  <p className="text-xs text-emerald-700">Fund: ₹{Number(myLenderProfile.available_fund).toLocaleString()} · Rate: {myLenderProfile.interest_rate}% · Risk: {myLenderProfile.maximum_risk}</p>
                </div>
              </div>
              <button onClick={() => deleteLender(myLenderProfile._id)}
                className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
                Delete Profile
              </button>
            </div>
          )}

          {/* Borrower Marketplace — Lender analyses each borrower */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#044335]">Borrower Marketplace</h2>
              <button onClick={fetchBorrowers}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                Refresh
              </button>
            </div>
            {borrowers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No borrowers registered yet.</p>
            ) : (
              <div className="space-y-4">
                {borrowers.map(b => {
                  const analysis = borrowerAnalysis[b._id];
                  const isAnalyzing = analyzingId === b._id;
                  return (
                    <div key={b._id} className="border border-gray-100 rounded-2xl overflow-hidden">
                      {/* Header row */}
                      <div className="p-5 flex items-start justify-between bg-white">
                        <div>
                          <h3 className="font-bold text-gray-800 text-base">{b.business_name}</h3>
                          <span className="inline-block mt-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">{b.business_type}</span>
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>📍 {b.location}</span>
                            <span>💰 ₹{Number(b.loan_amount).toLocaleString()} needed</span>
                            <span>📅 {b.loan_tenure}m tenure</span>
                          </div>
                        </div>
                        <button onClick={() => analyzeBorrower(b)} disabled={isAnalyzing}
                          className="bg-[#044335] hover:bg-[#065f46] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ml-4">
                          {isAnalyzing ? (
                            <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Analyzing…</>
                          ) : "Run Analysis"}
                        </button>
                      </div>
                      {/* Analysis Results */}
                      {analysis && (
                        <div className="bg-gradient-to-r from-[#f0faf6] to-[#f8fafc] border-t border-gray-100 p-5">
                          <div className="grid grid-cols-3 gap-4">
                            {/* Forecast */}
                            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Revenue Forecast</p>
                              <p className="text-2xl font-black text-[#044335]">₹{Number(analysis.predicted_revenue).toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">Predicted next month</p>
                            </div>
                            {/* Risk */}
                            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col items-center">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Risk Level</p>
                              <ProgressCircle
                                score={riskScore[analysis.risk_level] || 0}
                                label={`${analysis.risk_level} RISK`}
                                colorClass={riskColor[analysis.risk_level] || "stroke-slate-300"}
                                displayValue={analysis.risk_level}
                              />
                            </div>
                            {/* Trust Score */}
                            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col items-center">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Trust Score</p>
                              <ProgressCircle
                                score={analysis.trust_score || 0}
                                label={analysis.trust_level || "OUT OF 100"}
                                colorClass="stroke-[#044335]"
                                displayValue={analysis.trust_score}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Loan Request Management */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#044335]">Loan Request Management</h2>
              <button onClick={fetchMyRequests}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                Refresh
              </button>
            </div>
            {lenderRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No loan requests received yet.</p>
            ) : (
              <div className="space-y-3">
                {lenderRequests.map(req => (
                  <div key={req._id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{req.borrower_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">₹{Number(req.loan_amount).toLocaleString()} · {req.business_type}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge text={req.status} />
                      {req.status === "pending" && (
                        <>
                          <button onClick={() => updateRequestStatus(req._id, "approved")}
                            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition">
                            Approve
                          </button>
                          <button onClick={() => updateRequestStatus(req._id, "rejected")}
                            className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition">
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === "approved" && (
                        <button onClick={() => viewLenderRepayments(req.borrower_email)}
                          className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition">
                          View Repayments
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Suitable Borrowers */}
        <div className="w-[40%] h-full overflow-y-auto p-6 pl-0 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm h-full flex flex-col">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg leading-tight">Suitable Borrowers</h3>
                <p className="text-xs text-emerald-700 font-semibold mt-0.5">⚡ Greedy Algorithm — Auto-ranked</p>
              </div>
              <button onClick={fetchTopBorrowers} disabled={topBorrowersLoading}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5">
                {topBorrowersLoading ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : "↻"}
                Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {topBorrowersLoading && topBorrowers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <svg className="animate-spin h-8 w-8 text-[#044335]" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <p className="text-sm text-gray-400">Running analysis…</p>
                </div>
              ) : topBorrowers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <p className="text-sm text-gray-400">No eligible borrowers found for your risk appetite.</p>
                </div>
              ) : (
                topBorrowers.map((b, idx) => (
                  <div key={b._id} className="border border-gray-100 rounded-2xl p-4 bg-white hover:shadow-md transition">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="w-7 h-7 rounded-full bg-[#044335] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 text-sm truncate">{b.business_name}</h4>
                        <p className="text-xs text-gray-400">{b.business_type} · {b.location}</p>
                      </div>
                      <Badge text={b.risk_level} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["Loan", `₹${Number(b.loan_amount).toLocaleString()}`],
                        ["Revenue", `₹${Number(b.predicted_revenue).toLocaleString()}`],
                        ["Trust", `${b.trust_score}/100`],
                      ].map(([l, v]) => (
                        <div key={l} className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">{l}</p>
                          <p className="text-xs font-black text-gray-800 mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 mr-3">
                        <div className="bg-[#044335] h-1.5 rounded-full" style={{ width: `${(b.greedy_score * 100).toFixed(0)}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-[#044335] shrink-0">Score: {(b.greedy_score * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1.5">{b.trust_level} Trust</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-50 text-center">
              <p className="text-[10px] text-gray-400">Auto-refreshes every 30s · Updates when borrowers register</p>
            </div>
          </div>

          {/* LENDER REPAYMENT VIEW */}
          {lenderRepaymentView && lenderRepaymentView.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col p-6 mt-6">
              <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg leading-tight">Repayment Schedule</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{lenderRepaymentView[0].borrower_name} ({lenderRepaymentView[0].borrower_email})</p>
                </div>
                <button onClick={() => setLenderRepaymentView(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="space-y-4">
                {lenderRepaymentView.map(rep => {
                  const paidCount = rep.schedule?.filter(e => e.paid).length || 0;
                  const totalCount = rep.schedule?.length || 0;
                  return (
                    <div key={rep._id}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-gray-700">Loan: ₹{Number(rep.loan_amount).toLocaleString()}</span>
                        <span className="text-xs font-bold text-[#044335]">{paidCount}/{totalCount} Paid</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {rep.schedule?.map(emi => (
                          <div key={emi.emi_number} className={`p-2 rounded-xl border text-center ${emi.paid ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"}`}>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">EMI {emi.emi_number}</p>
                            <p className="font-bold text-gray-800 text-xs mt-0.5">₹{Number(emi.amount).toLocaleString()}</p>
                            {emi.paid ? (
                              <p className="text-[9px] text-emerald-700 font-bold mt-1">Paid on {emi.paid_date}</p>
                            ) : (
                              <p className="text-[9px] text-amber-600 font-bold mt-1">Due {emi.due_date}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

      <footer className="bg-white h-10 border-t border-gray-100 flex items-center justify-center text-xs text-gray-400 shrink-0">
        © 2024 MicroGrow Exchange · All rights reserved.
      </footer>
    </div>
  );
}

export default App;
