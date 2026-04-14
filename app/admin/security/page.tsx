"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, getDocs, where, startAfter } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Activity, 
  Users, 
  Globe,
  Clock,
  Filter,
  Download,
  Search,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface SecurityEvent {
  id: string;
  type: "AUTH_FAILURE" | "RATE_LIMIT" | "INVALID_REQUEST" | "SUSPICIOUS_ACTIVITY" | "ADMIN_ACCESS" | "SUSPICIOUS_USER_AGENT";
  ip: string;
  userAgent?: string;
  userId?: string;
  details: string;
  timestamp: any;
  severity: "low" | "medium" | "high" | "critical";
}

export default function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(
          collection(db, "security_logs"),
          orderBy("timestamp", "desc"),
          limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const eventsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as SecurityEvent[];

          setEvents(eventsData);
          calculateStats(eventsData);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error fetching security events:", error);
        toast.error("Failed to load security events");
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const calculateStats = (eventsData: SecurityEvent[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const newStats = {
      total: eventsData.length,
      critical: eventsData.filter(e => e.severity === "critical").length,
      high: eventsData.filter(e => e.severity === "high").length,
      medium: eventsData.filter(e => e.severity === "medium").length,
      low: eventsData.filter(e => e.severity === "low").length,
      today: eventsData.filter(e => {
        const eventDate = e.timestamp?.toDate?.();
        return eventDate && eventDate >= today;
      }).length,
      thisWeek: eventsData.filter(e => {
        const eventDate = e.timestamp?.toDate?.();
        return eventDate && eventDate >= thisWeek;
      }).length,
      thisMonth: eventsData.filter(e => {
        const eventDate = e.timestamp?.toDate?.();
        return eventDate && eventDate >= thisMonth;
      }).length,
    };

    setStats(newStats);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || event.severity === severityFilter;
    const matchesType = typeFilter === "all" || event.type === typeFilter;

    return matchesSearch && matchesSeverity && matchesType;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "low":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200 text-red-700";
      case "high":
        return "bg-orange-50 border-orange-200 text-orange-700";
      case "medium":
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
      case "low":
        return "bg-blue-50 border-blue-200 text-blue-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  const exportSecurityLogs = () => {
    const csv = [
      ["Timestamp", "Type", "Severity", "IP Address", "User ID", "Details"],
      ...filteredEvents.map(event => [
        event.timestamp?.toDate?.()?.toISOString() || "",
        event.type,
        event.severity,
        event.ip,
        event.userId || "",
        event.details
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Security logs exported successfully");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-medium text-text tracking-tight">Security Dashboard</h1>
          <p className="text-sm font-medium text-text-light mt-1 uppercase tracking-wider">Monitor and analyze security events</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all min-w-[320px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events, IPs, details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={exportSecurityLogs}
            className="flex h-[2.75rem] w-[2.75rem] items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Events", value: stats.total, icon: Shield, color: "bg-blue-500", detail: "All security events" },
          { label: "Critical", value: stats.critical, icon: XCircle, color: "bg-red-500", detail: "Immediate attention" },
          { label: "High Risk", value: stats.high, icon: AlertTriangle, color: "bg-orange-500", detail: "Investigate soon" },
          { label: "Today", value: stats.today, icon: Clock, color: "bg-purple-500", detail: "Events in last 24h" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${card.color} opacity-5 group-hover:scale-150 transition-transform duration-700`}></div>
            <div className="flex items-center justify-between mb-4">
              <div className={`h-10 w-10 rounded-xl ${card.color} flex items-center justify-center text-white shadow-lg`}>
                <card.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium text-text-light uppercase tracking-widest">{card.detail}</span>
            </div>
            <p className="text-[11px] font-medium text-text-light uppercase tracking-[0.15em] mb-1">{card.label}</p>
            <h3 className="text-2xl font-medium text-text tracking-tight">{card.value.toLocaleString()}</h3>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-medium"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100">
          <Activity className="h-4 w-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-medium"
          >
            <option value="all">All Types</option>
            <option value="AUTH_FAILURE">Auth Failures</option>
            <option value="RATE_LIMIT">Rate Limits</option>
            <option value="INVALID_REQUEST">Invalid Requests</option>
            <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
            <option value="ADMIN_ACCESS">Admin Access</option>
            <option value="SUSPICIOUS_USER_AGENT">Suspicious User Agent</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-medium text-text-light uppercase tracking-widest">Event</th>
                <th className="px-6 py-4 text-[10px] font-medium text-text-light uppercase tracking-widest">Severity</th>
                <th className="px-6 py-4 text-[10px] font-medium text-text-light uppercase tracking-widest">IP Address</th>
                <th className="px-6 py-4 text-[10px] font-medium text-text-light uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-[10px] font-medium text-text-light uppercase tracking-widest text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-sm font-medium text-text-light uppercase tracking-widest">Loading security events...</p>
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 border border-gray-100">
                      <Shield className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium text-text">No security events found</h3>
                    <p className="text-sm font-medium text-text-light mt-1">Security events will appear here when detected</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="group hover:bg-gray-50/30 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100">
                          <Eye className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text">{event.type.replace(/_/g, " ")}</p>
                          {event.userId && (
                            <p className="text-[10px] font-medium text-text-light">User: {event.userId.slice(0, 8)}...</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(event.severity)}
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getSeverityColor(event.severity)}`}>
                          {event.severity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-text font-mono">{event.ip}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-text leading-tight max-w-md truncate">
                        {event.details}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <p className="text-xs font-medium text-text">
                          {event.timestamp?.toDate?.() ? format(event.timestamp.toDate(), "MMM dd, yyyy") : ""}
                        </p>
                        <p className="text-[10px] font-medium text-text-light mt-0.5 uppercase tracking-wider">
                          {event.timestamp?.toDate?.() ? format(event.timestamp.toDate(), "hh:mm a") : ""}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
