import React, { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [shareReg, setShareReg] = useState(false);
  const [error, setError] = useState("");

  const [subjects, setSubjects] = useState([
    { code: "CSE202", name: "OOP", weekly: 7, attended: 0, delivered: 0, duty: 0 },
    { code: "CSE205", name: "DSA", weekly: 7, attended: 0, delivered: 0, duty: 0 },
    { code: "CSE307", name: "Internetworking", weekly: 2, attended: 0, delivered: 0, duty: 0 },
    { code: "MTH302", name: "Probability & Stats", weekly: 4, attended: 0, delivered: 0, duty: 0 },
  ]);

  const [dutyTarget, setDutyTarget] = useState(0);
  const [dutyHoursInput, setDutyHoursInput] = useState(0);
  const [semesterEnd, setSemesterEnd] = useState("2026-01-05");
  const [result, setResult] = useState(null);

  // Auto-login if creds saved
  useEffect(() => {
    const savedReg = localStorage.getItem("regNo");
    const savedPass = localStorage.getItem("regPass");

    // If both regNo and regPass are present we auto-fill and login.
    // Note: storing passwords in localStorage is insecure — prefer session or not saving.
    if (savedReg) setRegNo(savedReg);
    if (savedReg && savedPass) {
      setPassword(savedPass);
      setLoggedIn(true);
    }
  }, []);

  function handleLogin(e) {
    e.preventDefault();
    if (!regNo.trim() || !password.trim()) {
      setError("Invalid credentials.");
      return;
    }

    // Save based on user preference
    try {
      if (remember) {
        // User asked to remember credentials — store locally (not recommended for production)
        localStorage.setItem("regNo", regNo);
        localStorage.setItem("regPass", password);
      } else {
        // Store regNo only so we can pre-fill; do NOT persist password.
        localStorage.setItem("regNo", regNo);
        localStorage.removeItem("regPass");
      }
    } catch (err) {
      console.warn("Could not access localStorage:", err);
    }

    setLoggedIn(true);
    setError("");

    // If user consented to share regNo, send it to the server (DO NOT send password)
    if (shareReg) {
      // Send to local logger server or API endpoint (works for both dev and production)
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      fetch(`${serverUrl}/api/log-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regNo, timestamp: new Date().toISOString(), origin: window.location.origin }),
      }).catch((err) => console.warn("Failed to send regNo to server:", err));
    }
  }

  function clearSavedCredentials() {
    try {
      localStorage.removeItem("regNo");
      localStorage.removeItem("regPass");
    } catch (err) {
      console.warn("Could not modify localStorage:", err);
    }
    // Also clear form state
    setRegNo("");
    setPassword("");
    setRemember(false);
    setShareReg(false);
    setLoggedIn(false);
  }

  function updateSubject(index, key, value) {
    const copy = [...subjects];
    copy[index] = {
      ...copy[index],
      [key]: key === "attended" || key === "delivered" || key === "weekly" || key === "duty" ? Number(value) : value,
    };
    setSubjects(copy);
  }

  function addDutyToSubject() {
    const idx = Number(dutyTarget) || 0;
    const hours = Number(dutyHoursInput) || 0;
    if (hours <= 0) return;
    const copy = [...subjects];
    copy[idx] = { ...copy[idx], duty: (Number(copy[idx].duty) || 0) + hours };
    setSubjects(copy);
    setDutyHoursInput(0);
  }

  function addSubject() {
    const newSubject = {
      code: `CSE${Math.floor(Math.random() * 1000)}`,
      name: "New Subject",
      weekly: 3,
      attended: 0,
      delivered: 0,
    };
    setSubjects([...subjects, newSubject]);
  }

  function removeSubject(index) {
    setSubjects(subjects.filter((_, i) => i !== index));
  }

  function weeksRemaining() {
    const today = new Date();
    const end = new Date(semesterEnd + "T00:00:00");
    const ms = 1000 * 60 * 60 * 24;
    const days = Math.max(0, Math.ceil((end - today) / ms));
    return days;
  }

  function compute() {
    const daysLeft = weeksRemaining();
    const fullWeeks = Math.floor(daysLeft / 7);
    const leftoverDays = daysLeft % 7;

    const future = subjects.map((s) => {
      const perDay = s.weekly / 7;
      return s.weekly * fullWeeks + Math.round(perDay * leftoverDays);
    });

    const deliveredNow = subjects.reduce((a, b) => a + b.delivered, 0);
    const attendedNow = subjects.reduce((a, b) => a + b.attended, 0);

    // dutyCount is total duty hours/classes given per-subject (treated as attended credits)
    const dutyCount = subjects.reduce((a, b) => a + (Number(b.duty) || 0), 0);
    const attendedWithDuty = attendedNow + dutyCount;

    const futureTotal = future.reduce((a, b) => a + b, 0);
    const finalDelivered = deliveredNow + futureTotal;

    const requiredTotal = Math.ceil(0.75 * finalDelivered);
    const finalIfFull = attendedWithDuty + futureTotal;

    const requiredFuture = Math.max(0, requiredTotal - attendedWithDuty);
    const bunkPossible = Math.max(0, futureTotal - requiredFuture);

    const perSubject = subjects.map((s, i) => {
      const dutySub = Number(s.duty) || 0;
      const finalAtt = s.attended + dutySub + future[i];
      const finalDel = s.delivered + future[i];
      const mustAttend = Math.max(
        0,
        Math.ceil(0.75 * finalDel) - (s.attended + dutySub)
      );
      const canBunk = Math.max(0, future[i] - mustAttend);
      const currentPerc =
        s.delivered > 0 ? (s.attended / s.delivered) * 100 : 0;
      const finalPerc = finalDel > 0 ? (finalAtt / finalDel) * 100 : 0;

      return {
        code: s.code,
        name: s.name,
        future: future[i],
        mustAttend,
        canBunk,
        currentPerc: Math.round(currentPerc * 100) / 100,
        finalPerc: Math.round(finalPerc * 100) / 100,
      };
    });

    setResult({
      dutyCount,
      deliveredNow,
      attendedNow,
      attendedWithDuty,
      futureTotal,
      requiredFuture,
      bunkPossible,
      finalDelivered,
      finalIfFull,
      finalAggregate: Math.round((finalIfFull / finalDelivered) * 10000) / 100,
      perSubject,
    });
  }

  // ---------------- LOGIN SCREEN ----------------
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="dashboard-card card-hover">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-gradient mb-2">LPU Attendance</h1>
              <p className="text-sm text-slate-400">
                Student Dashboard Portal
              </p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Registration Number
                </label>
                <input
                  className="dashboard-input input-focus"
                  placeholder="Enter your registration number"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Remember me (store locally)
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={shareReg} onChange={(e) => setShareReg(e.target.checked)} />
                  Agree (terms and conditions)
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  UMS Password
                </label>
                <input
                  type="password"
                  className="dashboard-input input-focus"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <button type="submit" className="btn-primary w-full">
                Sign In
              </button>

              <div className="flex justify-between items-center mt-2">
                <button type="button" onClick={clearSavedCredentials} className="btn-secondary">
                  Clear saved credentials
                </button>
                <div className="text-xs text-slate-400">This login is local only. Not connected to UMS.</div>
              </div>
              
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- MAIN APP ----------------
  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="dashboard-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2">Attendance Dashboard</h1>
              <p className="text-slate-400 flex items-center gap-2">
                <span className="status-indicator active"></span>
                Logged in as <span className="font-semibold text-blue-400">{regNo}</span>
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("regNo");
                localStorage.removeItem("regPass");
                setLoggedIn(false);
              }}
              className="btn-secondary mt-4 md:mt-0"
            >
              Logout
            </button>
          </div>

          {/* Configuration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="stat-card">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Assign Duty Hours to Subject
              </label>
              <div className="flex items-center gap-2">
                <select
                  className="dashboard-input"
                  value={dutyTarget}
                  onChange={(e) => setDutyTarget(Number(e.target.value))}
                >
                  {subjects.map((s, idx) => (
                    <option key={idx} value={idx}>{`${s.code} — ${s.name}`}</option>
                  ))}
                </select>

                <input
                  type="number"
                  className="dashboard-input"
                  value={dutyHoursInput}
                  onChange={(e) => setDutyHoursInput(Number(e.target.value || 0))}
                  placeholder="Hours"
                  min="0"
                />

                <button className="btn-primary" onClick={addDutyToSubject} type="button">Add</button>
              </div>

              <p className="text-sm text-slate-400 mt-3">You can also edit duty hours directly in the table for each subject.</p>
            </div>

            <div className="stat-card">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Semester End Date
              </label>
              <input
                type="date"
                className="dashboard-input"
                value={semesterEnd}
                onChange={(e) => setSemesterEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Subjects Section */}
        <div className="dashboard-card">
          <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-400 rounded-full shadow-lg shadow-blue-500/50"></span>
            Subjects
          </h2>

          <div className="table-wrapper">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header Row */}
              <div className="grid grid-cols-8 gap-3 mb-3 px-4 py-3 bg-gradient-to-r from-blue-600/80 to-blue-700/80 text-white rounded-t-lg">
                  <div className="font-semibold text-sm uppercase tracking-wide text-blue-50">Code</div>
                  <div className="font-semibold text-sm uppercase tracking-wide text-blue-50">Subject Name</div>
                  <div className="font-semibold text-sm uppercase tracking-wide text-blue-50">Weekly</div>
                  <div className="font-semibold text-sm uppercase tracking-wide text-blue-50">Attended</div>
                  <div className="font-semibold text-sm uppercase tracking-wide text-blue-50">Delivered</div>
                  <div className="font-semibold text-sm uppercase tracking-wide text-blue-50">Duty Hrs</div>
                  <div className="font-semibold text-sm uppercase tracking-wide text-blue-50">Current %</div>
                  <div></div>
                </div>

                {/* Subject Rows */}
                {subjects.map((s, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-8 gap-3 px-4 py-3 mb-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-blue-500/50 hover:bg-slate-800/70 hover:shadow-lg shadow-blue-500/10 transition-all duration-200"
                  >
                    <input
                      value={s.code}
                      onChange={(e) => updateSubject(i, "code", e.target.value)}
                      className="dashboard-input text-sm font-mono"
                      placeholder="CSE202"
                    />

                    <input
                      value={s.name}
                      onChange={(e) => updateSubject(i, "name", e.target.value)}
                      className="dashboard-input text-sm"
                      placeholder="Subject Name"
                    />

                    <input
                      type="number"
                      value={s.weekly}
                      onChange={(e) => updateSubject(i, "weekly", e.target.value)}
                      className="dashboard-input text-sm"
                      placeholder="0"
                      min="0"
                    />

                    <input
                      type="number"
                      value={s.attended}
                      onChange={(e) => updateSubject(i, "attended", e.target.value)}
                      className="dashboard-input text-sm"
                      placeholder="0"
                      min="0"
                    />

                    <input
                      type="number"
                      value={s.delivered}
                      onChange={(e) => updateSubject(i, "delivered", e.target.value)}
                      className="dashboard-input text-sm"
                      placeholder="0"
                      min="0"
                    />

                    <input
                      type="number"
                      value={s.duty}
                      onChange={(e) => updateSubject(i, "duty", e.target.value)}
                      className="dashboard-input text-sm"
                      placeholder="Duty hrs"
                      min="0"
                    />

                    <div className="flex items-center justify-center">
                      {s.delivered > 0 && (
                        <span className={`badge ${
                          (s.attended / s.delivered) * 100 >= 75 
                            ? 'badge-success' 
                            : (s.attended / s.delivered) * 100 >= 60 
                            ? 'badge-warning' 
                            : 'badge-danger'
                        }`}>
                          {Math.round((s.attended / s.delivered) * 100)}%
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => removeSubject(i)}
                      className="btn-danger"
                      title="Delete subject"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Add Subject Button */}
          <div className="mt-4">
            <button
              onClick={addSubject}
              className="btn-primary"
            >
              + Add Subject
            </button>
          </div>
        </div>





        {/* Compute Button */}
        <div className="flex justify-center">
          <button
            onClick={compute}
            className="btn-primary px-8 py-3 text-lg"
          >
            Calculate Attendance
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="dashboard-card card-hover">
            <h3 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-400 rounded-full shadow-lg shadow-blue-500/50"></span>
              Analysis Results
            </h3>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="stat-card">
                <div className="metric-label">Duty Count</div>
                <div className="metric-value text-blue-400">{result.dutyCount}</div>
              </div>
              
              <div className="stat-card">
                <div className="metric-label">Future Classes</div>
                <div className="metric-value text-cyan-400">{result.futureTotal}</div>
              </div>
              
              <div className="stat-card">
                <div className="metric-label">Must Attend</div>
                <div className="metric-value text-amber-400">{result.requiredFuture}</div>
              </div>
              
              <div className="stat-card">
                <div className="metric-label">Can Bunk</div>
                <div className="metric-value text-emerald-400">{result.bunkPossible}</div>
              </div>
            </div>

            {/* Final Aggregate Card */}
            <div className="stat-card bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/50 mb-6">
              <div className="metric-label text-blue-400">Final Aggregate</div>
              <div className="text-4xl font-bold text-cyan-300 mt-2">
                {result.finalAggregate}%
              </div>
              <p className="text-sm text-slate-400 mt-2">If full attendance maintained</p>
            </div>

            {/* Per Subject Table */}
            <div>
              <h4 className="text-lg font-bold text-slate-100 mb-4">Per Subject Breakdown</h4>
              <div className="table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Future Classes</th>
                      <th>Must Attend</th>
                      <th>Can Bunk</th>
                      <th>Current %</th>
                      <th>Final %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.perSubject.map((p, idx) => (
                      <tr key={idx}>
                        <td className="font-mono font-semibold">{p.code}</td>
                        <td>{p.future}</td>
                        <td>
                          <span className="badge badge-warning">{p.mustAttend}</span>
                        </td>
                        <td>
                          <span className="badge badge-success">{p.canBunk}</span>
                        </td>
                        <td>
                          <span className={`badge ${
                            p.currentPerc >= 75 
                              ? 'badge-success' 
                              : p.currentPerc >= 60 
                              ? 'badge-warning' 
                              : 'badge-danger'
                          }`}>
                            {p.currentPerc}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            p.finalPerc >= 75 
                              ? 'badge-success' 
                              : p.finalPerc >= 60 
                              ? 'badge-warning' 
                              : 'badge-danger'
                          }`}>
                            {p.finalPerc}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
