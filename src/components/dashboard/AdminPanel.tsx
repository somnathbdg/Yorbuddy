import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  Calendar,
  IndianRupee,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Eye,
  Filter,
  Check,
  X,
  MapPin,
  Mail,
  Star,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { userService, AdminPendingKyc } from '../../services/user';
import { reportService } from '../../services/report';
import { bookingService, Booking, PaginationMeta } from '../../services/booking';

interface VerifiedBuddy {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  photo_url?: string;
  city?: string;
  area?: string;
  bio?: string;
  interests?: string[];
  hourly_rate: number;
  rating: number;
  review_count: number;
  supported_activity_ids: string[];
  verification_status: string;
  is_verified: boolean;
  safety_pledge_signed: boolean;
  verified_at: string;
}

export const AdminPanel: React.FC = () => {
  useApp();

  const [activeSubTab, setActiveSubTab] = useState<'verifications' | 'bookings' | 'reports'>('verifications');

  // All stats from backend API
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [verifiedBuddies, setVerifiedBuddies] = useState<number>(0);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [pendingKycCount, setPendingKycCount] = useState<number>(0);

  // Verified buddies modal
  const [showVerifiedBuddiesModal, setShowVerifiedBuddiesModal] = useState(false);
  const [verifiedBuddiesList, setVerifiedBuddiesList] = useState<VerifiedBuddy[]>([]);
  const [isLoadingVerifiedBuddies, setIsLoadingVerifiedBuddies] = useState(false);
  const [verifiedBuddiesError, setVerifiedBuddiesError] = useState<string | null>(null);

  const [pendingKyc, setPendingKyc] = useState<AdminPendingKyc[]>([]);
  const [safetyReports, setSafetyReports] = useState<any[]>([]);
  const [safetyReportCount, setSafetyReportCount] = useState(0);
  const [isLoadingKyc, setIsLoadingKyc] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);

  // Admin bookings pagination state
  const [adminBookings, setAdminBookings] = useState<Booking[]>([]);
  const [bookingsMeta, setBookingsMeta] = useState<PaginationMeta | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingsPage, setBookingsPage] = useState(1);
  const bookingsLimit = 20;

  // Fetch all admin stats from backend
  const fetchStats = useCallback(async () => {
    try {
      const adminStats = await userService.getAdminStats();
      setTotalMembers(adminStats.data.total_members || 0);
      setVerifiedBuddies(adminStats.data.verified_buddies || 0);
      setTotalSessions(adminStats.data.total_bookings || 0);
      setPendingKycCount(adminStats.data.pending_kyc || 0);
    } catch {
      setTotalMembers(0);
      setVerifiedBuddies(0);
      setTotalSessions(0);
      setPendingKycCount(0);
    }
  }, []);

  // Fetch safety reports from API on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await reportService.getReports();
        setSafetyReports(response.data);
        setSafetyReportCount(response.count);
      } catch (err: any) {
        setSafetyReports([]);
        setSafetyReportCount(0);
      }
    };
    fetchReports();
  }, []);

  // Fetch pending KYC from API on mount
  useEffect(() => {
    const fetchPendingKyc = async () => {
      setIsLoadingKyc(true);
      setKycError(null);
      try {
        const response = await userService.getPendingKyc();
        setPendingKyc(response.data);
      } catch (err: any) {
        const apiError = err.response?.data?.error;
        setKycError(apiError?.message || 'Failed to load pending KYC.');
        setPendingKyc([]);
      } finally {
        setIsLoadingKyc(false);
      }
    };
    fetchPendingKyc();
  }, []);

  // Fetch stats from backend on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchVerifiedBuddies = useCallback(async () => {
    setIsLoadingVerifiedBuddies(true);
    setVerifiedBuddiesError(null);
    try {
      const response = await userService.getVerifiedBuddies();
      setVerifiedBuddiesList(response.data);
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setVerifiedBuddiesError(apiError?.message || 'Failed to load verified buddies.');
      setVerifiedBuddiesList([]);
    } finally {
      setIsLoadingVerifiedBuddies(false);
    }
  }, []);

  const handleVerifiedBuddiesClick = () => {
    setShowVerifiedBuddiesModal(true);
    fetchVerifiedBuddies();
  };

  // Fetch paginated bookings for admin
  const fetchAdminBookings = useCallback(async (page: number) => {
    setIsLoadingBookings(true);
    setBookingsError(null);
    try {
      const response = await bookingService.getBookings(page, bookingsLimit);
      setAdminBookings(response.bookings);
      setBookingsMeta(response.meta);
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setBookingsError(apiError?.message || 'Failed to load bookings.');
      setAdminBookings([]);
      setBookingsMeta(null);
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  // Fetch bookings when switching to bookings tab or changing page
  useEffect(() => {
    if (activeSubTab === 'bookings') {
      fetchAdminBookings(bookingsPage);
    }
  }, [activeSubTab, bookingsPage, fetchAdminBookings]);

  const handleApproveKyc = async (kycId: string) => {
    try {
      await userService.approveKyc(kycId);
      // Remove from pending list
      setPendingKyc((prev) => prev.filter((k) => k.id !== kycId));
      // Refresh ALL stats after approval
      await fetchStats();
      alert('KYC approved successfully.');
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      alert(apiError?.message || 'Failed to approve KYC.');
    }
  };

  const handleRejectKyc = async (kycId: string) => {
    const reason = prompt('Enter rejection reason (min 10 characters):');
    if (!reason || reason.length < 10) {
      alert('Rejection reason must be at least 10 characters.');
      return;
    }
    try {
      await userService.rejectKyc(kycId, reason);
      // Remove from pending list
      setPendingKyc((prev) => prev.filter((k) => k.id !== kycId));
      // Refresh stats
      await fetchStats();
      alert('KYC rejected successfully.');
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      alert(apiError?.message || 'Failed to reject KYC.');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Admin Header */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-400 text-xs font-black uppercase tracking-wider">
                YorBuddy Control Plane
              </span>
              <span className="text-xs text-slate-400">• Operations & Moderation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              Trust & Safety Admin Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Audit government documents, verify companions, and uphold the strictly platonic public policy.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveSubTab('verifications')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'verifications'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              KYC ({pendingKyc.length})
            </button>
            <button
              onClick={() => setActiveSubTab('reports')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'reports'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Safety Reports ({safetyReportCount})
            </button>
            <button
              onClick={() => { setBookingsPage(1); setActiveSubTab('bookings'); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'bookings'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bookings ({bookingsMeta?.total ?? totalSessions})
            </button>
          </div>
        </div>

        {/* 4 Core Admin KPI Stats — fetched from backend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Total Members</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalMembers}</div>
            <p className="text-[11px] text-emerald-600 font-semibold">Registered users</p>
          </div>

          <div
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1 cursor-pointer hover:shadow-md hover:border-pink-300 transition-all group"
            onClick={handleVerifiedBuddiesClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleVerifiedBuddiesClick(); }}
            aria-label={`View verified buddies list (${verifiedBuddies} total)`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Verified Buddies</span>
              <ShieldCheck className="w-4 h-4 text-pink-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900">{verifiedBuddies}</div>
            <p className="text-[11px] text-blue-600 font-semibold group-hover:text-blue-700">Active companions →</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Total Sessions</span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalSessions}</div>
            <p className="text-[11px] text-slate-500">All bookings</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Pending KYC</span>
              <IndianRupee className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{pendingKycCount}</div>
            <p className="text-[11px] text-amber-600 font-semibold">Awaiting review</p>
          </div>
        </div>

        {/* Tab 1: KYC Verification Approvals */}
        {activeSubTab === 'verifications' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  KYC Verification Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Review identity document submissions and approve or reject KYC verification.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsLoadingKyc(true);
                  userService.getPendingKyc().then((res) => {
                    setPendingKyc(res.data);
                    setIsLoadingKyc(false);
                  }).catch(() => setIsLoadingKyc(false));
                  fetchStats();
                }}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                Refresh
              </button>
            </div>

            {isLoadingKyc && (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-slate-700">Loading pending KYC...</p>
              </div>
            )}

            {kycError && !isLoadingKyc && (
              <div className="p-8 text-center bg-rose-50 rounded-2xl border border-rose-200">
                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-rose-600">{kycError}</p>
                <p className="text-xs text-rose-500 mt-1">Admin access required to view KYC submissions.</p>
              </div>
            )}

            {!isLoadingKyc && !kycError && pendingKyc.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No pending KYC submissions</p>
                <p className="text-xs text-slate-500 mt-1">All caught up!</p>
              </div>
            )}

            {!isLoadingKyc && pendingKyc.length > 0 && (
              <div className="space-y-4">
                {pendingKyc.map((kyc) => (
                  <div
                    key={kyc.id}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{kyc.user.full_name}</span>
                        <span className="text-xs text-slate-500">
                          ({kyc.user.email})
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                          {kyc.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                        <span className="flex items-center">
                          <FileCheck className="w-3.5 h-3.5 text-blue-600 mr-1" />
                          Doc: <strong className="ml-1 capitalize">{kyc.doc_type}</strong>
                        </span>
                        <span>•</span>
                        <span className="text-slate-500">
                          Submitted: {new Date(kyc.submitted_at).toLocaleDateString('en-IN')}
                        </span>
                        {kyc.user.phone && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{kyc.user.phone}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApproveKyc(kyc.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleRejectKyc(kyc.id)}
                        className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Safety Reports Moderation */}
        {activeSubTab === 'reports' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Safety Incident Reports & Policy Moderation
              </h2>
              <p className="text-xs text-slate-500">
                Maintain 100% platonic and public compliance. Instant account actions.
              </p>
            </div>

            {safetyReports.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No safety reports</p>
                <p className="text-xs text-slate-500 mt-1">All clear!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {safetyReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span className="text-xs font-bold text-rose-950">
                            Category: {rep.category.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                            {rep.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-rose-900 mt-1">
                          {rep.description}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(rep.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                      <span>
                        Reported User ID: <strong>{rep.reported_id}</strong>
                      </span>
                      <div className="flex items-center space-x-2">
                        {rep.status === 'pending' && (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  await reportService.updateReportStatus(rep.id, 'investigating');
                                  setSafetyReports((prev) =>
                                    prev.map((r) => (r.id === rep.id ? { ...r, status: 'investigating' } : r))
                                  );
                                } catch {
                                  alert('Failed to update report status.');
                                }
                              }}
                              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold"
                            >
                              Investigate
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await reportService.updateReportStatus(rep.id, 'resolved');
                                  setSafetyReports((prev) =>
                                    prev.map((r) => (r.id === rep.id ? { ...r, status: 'resolved' } : r))
                                  );
                                } catch {
                                  alert('Failed to update report status.');
                                }
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await reportService.updateReportStatus(rep.id, 'dismissed');
                                  setSafetyReports((prev) =>
                                    prev.map((r) => (r.id === rep.id ? { ...r, status: 'dismissed' } : r))
                                  );
                                } catch {
                                  alert('Failed to update report status.');
                                }
                              }}
                              className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-[10px] font-bold"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                        {rep.status !== 'pending' && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {rep.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: System Bookings (Paginated) */}
        {activeSubTab === 'bookings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">
                Live Session Activity Log
              </h2>
              {bookingsMeta && (
                <span className="text-xs text-slate-500">
                  Page {bookingsMeta.page} of {bookingsMeta.totalPages} • {bookingsMeta.total} total
                </span>
              )}
            </div>

            {isLoadingBookings && (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-slate-700">Loading bookings...</p>
              </div>
            )}

            {bookingsError && !isLoadingBookings && (
              <div className="p-8 text-center bg-rose-50 rounded-2xl border border-rose-200">
                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-rose-600">{bookingsError}</p>
              </div>
            )}

            {!isLoadingBookings && !bookingsError && adminBookings.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No bookings found</p>
                <p className="text-xs text-slate-500 mt-1">Bookings will appear here as they are created</p>
              </div>
            )}

            {!isLoadingBookings && !bookingsError && adminBookings.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold">
                        <th className="py-3 px-2">Booking Code</th>
                        <th className="py-3 px-2">Schedule</th>
                        <th className="py-3 px-2">Duration</th>
                        <th className="py-3 px-2">Venue</th>
                        <th className="py-3 px-2">Amount</th>
                        <th className="py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="py-3 px-2 font-mono font-bold text-blue-700">
                            {b.booking_code}
                          </td>
                          <td className="py-3 px-2 text-slate-800 font-medium">
                            {b.booking_date} • {b.booking_time}
                          </td>
                          <td className="py-3 px-2 text-slate-600">
                            {b.duration_hours} hrs
                          </td>
                          <td className="py-3 px-2 text-slate-700">
                            {b.location_name}
                          </td>
                          <td className="py-3 px-2 font-bold text-slate-900">
                            ₹{b.total_amount}
                          </td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {bookingsMeta && bookingsMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setBookingsPage((p) => Math.max(1, p - 1))}
                      disabled={!bookingsMeta.hasPreviousPage}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:bg-slate-100"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <span className="text-xs text-slate-500">
                      Page {bookingsMeta.page} of {bookingsMeta.totalPages}
                    </span>
                    <button
                      onClick={() => setBookingsPage((p) => p + 1)}
                      disabled={!bookingsMeta.hasNextPage}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:bg-slate-100"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Verified Buddies Modal */}
      {showVerifiedBuddiesModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="w-6 h-6 text-pink-600" />
                  <span>Verified Buddies</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">All approved and verified companions ({verifiedBuddiesList.length})</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchVerifiedBuddies}
                  className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setShowVerifiedBuddiesModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingVerifiedBuddies && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
                </div>
              )}

              {verifiedBuddiesError && !isLoadingVerifiedBuddies && (
                <div className="p-8 text-center bg-rose-50 rounded-2xl border border-rose-200">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-rose-600">{verifiedBuddiesError}</p>
                </div>
              )}

              {!isLoadingVerifiedBuddies && !verifiedBuddiesError && verifiedBuddiesList.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No verified buddies yet</p>
                  <p className="text-xs text-slate-500 mt-1">Buddies will appear here after KYC approval</p>
                </div>
              )}

              {!isLoadingVerifiedBuddies && !verifiedBuddiesError && verifiedBuddiesList.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {verifiedBuddiesList.map((buddy) => (
                    <div key={buddy.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-4">
                        {/* Profile Photo */}
                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
                          {buddy.photo_url ? (
                            <img src={buddy.photo_url} alt={buddy.full_name} className="w-full h-full object-cover" />
                          ) : (
                            buddy.full_name?.charAt(0) || '?'
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-bold text-slate-900 truncate">{buddy.full_name}</h3>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">Verified</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate flex items-center mt-0.5">
                            <Mail className="w-3 h-3 mr-1" />
                            {buddy.email}
                          </p>
                          {buddy.city && (
                            <p className="text-xs text-slate-500 truncate flex items-center mt-0.5">
                              <MapPin className="w-3 h-3 mr-1" />
                              {buddy.city}{buddy.area ? `, ${buddy.area}` : ''}
                            </p>
                          )}

                          {/* Rating & Rate */}
                          <div className="flex items-center space-x-3 mt-2 text-xs text-slate-600">
                            <span className="flex items-center">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-1" />
                              {buddy.rating > 0 ? buddy.rating.toFixed(1) : 'New'}
                            </span>
                            <span className="font-bold text-slate-900">₹{buddy.hourly_rate}/hr</span>
                            {buddy.review_count > 0 && <span>({buddy.review_count} reviews)</span>}
                          </div>

                          {/* Interests */}
                          {buddy.interests && buddy.interests.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {buddy.interests.slice(0, 3).map((interest, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">
                                  {interest}
                                </span>
                              ))}
                              {buddy.interests.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                                  +{buddy.interests.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Status Badges */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700">KYC Approved</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700">Verified Buddy</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
