"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Search,
  Download,
  Eye,
  EyeOff,
  Loader2,
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  LogOut,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Hash,
  Edit2,
  Save,
  X,
} from "lucide-react";

interface TopicRow {
  id: string;
  serial: number;
  studentId: string;
  topicTitle: string;
  status: string;
  createdAt: string | null;
}

type SortKey = "serial" | "studentId" | "topicTitle" | "createdAt";
type SortDir = "asc" | "desc";

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<TopicRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [adminKey, setAdminKey] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStudentId, setEditStudentId] = useState("");
  const [editTopicTitle, setEditTopicTitle] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("serial");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Filter + sort whenever topics/search/sort changes
  useEffect(() => {
    let result = [...topics];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.studentId.toLowerCase().includes(q) ||
          t.topicTitle.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA = a[sortKey] ?? "";
      let valB = b[sortKey] ?? "";
      if (sortKey === "serial") {
        return sortDir === "asc" ? a.serial - b.serial : b.serial - a.serial;
      }
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredTopics(result);
  }, [topics, search, sortKey, sortDir]);

  const fetchTopics = useCallback(
    async (key: string) => {
      setDataLoading(true);
      setDataError("");
      try {
        const res = await fetch("/api/admin/topics", {
          headers: { "x-admin-key": key },
        });
        if (!res.ok) {
          setDataError("Failed to load topics. Please try refreshing.");
          return;
        }
        const data = await res.json();
        setTopics(data.topics ?? []);
      } catch {
        setDataError("Network error while loading topics.");
      } finally {
        setDataLoading(false);
      }
    },
    []
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) return;
    setAuthLoading(true);
    setAuthError("");

    const res = await fetch("/api/admin/topics", {
      headers: { "x-admin-key": passcode.trim() },
    });

    if (res.ok) {
      const data = await res.json();
      setAdminKey(passcode.trim());
      setTopics(data.topics ?? []);
      setIsAuthenticated(true);
    } else {
      setAuthError("Incorrect passcode. Please try again.");
    }
    setAuthLoading(false);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function exportCSV() {
    const headers = ["#", "Student ID", "Topic Title", "Status", "Submitted At"];
    const rows = filteredTopics.map((t) => [
      t.serial,
      `"${t.studentId}"`,
      `"${t.topicTitle.replace(/"/g, '""')}"`,
      t.status,
      t.createdAt ? new Date(t.createdAt).toLocaleString() : "N/A",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `term-paper-topics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3.5 h-3.5 text-slate-600" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
    );
  }

  async function saveEdit(id: string) {
    if (!editStudentId.trim() || !editTopicTitle.trim()) return;
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/topics", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          id,
          studentId: editStudentId,
          topicTitle: editTopicTitle,
        }),
      });

      if (res.ok) {
        setTopics((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, studentId: editStudentId, topicTitle: editTopicTitle }
              : t
          )
        );
        setEditingId(null);
      } else {
        alert("Failed to save changes.");
      }
    } catch (err) {
      alert("Network error.");
    } finally {
      setSavingId(null);
    }
  }

  function startEditing(topic: TopicRow) {
    setEditingId(topic.id);
    setEditStudentId(topic.studentId);
    setEditTopicTitle(topic.topicTitle);
  }

  // ─── Login Screen ────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 items-center justify-center mb-4 shadow-lg shadow-indigo-900/30">
              <Shield className="w-7 h-7 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Faculty Access</h1>
            <p className="text-slate-500 text-sm mt-1">Admin-only area. Enter your passcode.</p>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-6 shadow-2xl shadow-black/40">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="admin-pass" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Admin Passcode
                </label>
                <div className="relative">
                  <input
                    id="admin-pass"
                    type={showPasscode ? "text" : "password"}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter passcode"
                    className="
                      w-full px-4 py-3 pr-10 rounded-xl
                      bg-slate-800/60 border border-slate-700/60
                      text-slate-200 placeholder:text-slate-600
                      text-sm
                      focus:outline-none focus:border-indigo-500/60
                      focus:ring-2 focus:ring-indigo-500/20
                      transition-all
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {authError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-xs"
                  >
                    {authError}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={authLoading || !passcode.trim()}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                {authLoading ? "Verifying…" : "Access Dashboard"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Admin Dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[300px] rounded-full bg-indigo-600/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-indigo-400 font-medium">Faculty Dashboard</p>
              <h1 className="text-sm font-semibold text-slate-200 leading-none">Term Paper Topics</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTopics(adminKey)}
              disabled={dataLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={filteredTopics.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-xs text-indigo-400 hover:bg-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => { setIsAuthenticated(false); setAdminKey(""); setTopics([]); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            {
              icon: <Users className="w-4 h-4 text-indigo-400" />,
              label: "Total Submissions",
              value: topics.length,
              color: "indigo",
            },
            {
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
              label: "Approved Topics",
              value: topics.filter((t) => t.status === "approved").length,
              color: "emerald",
            },
            {
              icon: <Calendar className="w-4 h-4 text-violet-400" />,
              label: "Showing in Table",
              value: filteredTopics.length,
              color: "violet",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-lg bg-${stat.color}-500/10 border border-${stat.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student ID or topic title…"
            className="
              w-full pl-10 pr-4 py-3 rounded-xl
              bg-slate-900/60 border border-slate-700/50
              text-slate-200 placeholder:text-slate-600
              text-sm
              focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20
              transition-all
            "
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40">
          {dataLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading topics…</span>
            </div>
          ) : dataError ? (
            <div className="text-center py-16 text-red-400 text-sm">{dataError}</div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {search ? "No topics match your search." : "No topic submissions yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th
                      className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                      onClick={() => handleSort("serial")}
                    >
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3" />
                        <span>#</span>
                        <SortIcon col="serial" />
                      </div>
                    </th>
                    <th
                      className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                      onClick={() => handleSort("studentId")}
                    >
                      <div className="flex items-center gap-1.5">
                        Student ID
                        <SortIcon col="studentId" />
                      </div>
                    </th>
                    <th
                      className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                      onClick={() => handleSort("topicTitle")}
                    >
                      <div className="flex items-center gap-1.5">
                        Topic Title
                        <SortIcon col="topicTitle" />
                      </div>
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th
                      className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center gap-1.5">
                        Submitted
                        <SortIcon col="createdAt" />
                      </div>
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  <AnimatePresence>
                    {filteredTopics.map((topic, idx) => (
                      <motion.tr
                        key={topic.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="px-5 py-4 text-slate-600 font-mono text-xs">
                          {topic.serial}
                        </td>
                        <td className="px-5 py-4">
                          {editingId === topic.id ? (
                            <input
                              type="text"
                              value={editStudentId}
                              onChange={(e) => setEditStudentId(e.target.value)}
                              className="w-full bg-slate-800 border border-indigo-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          ) : (
                            <span className="font-mono text-xs bg-slate-800 border border-slate-700/60 text-slate-300 px-2 py-1 rounded-md">
                              {topic.studentId}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 max-w-sm">
                          {editingId === topic.id ? (
                            <textarea
                              value={editTopicTitle}
                              onChange={(e) => setEditTopicTitle(e.target.value)}
                              rows={2}
                              className="w-full bg-slate-800 border border-indigo-500/50 rounded px-2 py-1 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          ) : (
                            <p className="text-slate-300 text-sm leading-relaxed">{topic.topicTitle}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {topic.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500 font-mono whitespace-nowrap">
                          {topic.createdAt
                            ? new Date(topic.createdAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {editingId === topic.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveEdit(topic.id)}
                                disabled={savingId === topic.id}
                                className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
                                title="Save"
                              >
                                {savingId === topic.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                disabled={savingId === topic.id}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(topic)}
                              className="p-1.5 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          {filteredTopics.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-600">
              <span>Showing {filteredTopics.length} of {topics.length} submissions</span>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-400 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export visible rows as CSV
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
