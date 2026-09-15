import React, { useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AdminPanel: React.FC = () => {
  const { buddies, bookings, verifyBuddy } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'verifications' | 'bookings' | 'reports'>('verifications');

  // Simulated verification queue
  const [verificationQueue, setVerificationQueue] = useState([
    {
      id: 'buddy-new-1',
      name: 'Rohan Mehra',
      city: 'Pune',
      area: 'Kothrud',
      idType: 'Aadhaar Card',
      idNumber: 'XXXX-XXXX-9942',
      videoKYC: 'Verified 45s intro video',
      rate: '₹600/hr',
      status: 'pending',
    },
    {
      id: 'buddy-new-2',
      name: 'Sneha Deshmukh',
      city: 'Bengaluru',
      area: 'HSR Layout',
      idType: 'Passport',
      idNumber: 'Z8921045',
      videoKYC: 'Verified 30s intro video',
      rate: '₹750/hr',
      status: 'pending',
    },
    {
      id: 'buddy-new-3',
      name: 'Aman Verma',
      city: 'Mumbai',
      area: 'Powai',
      idType: 'PAN Card',
      idNumber: 'ABCDE1234F',
      videoKYC: 'Verified intro video',
      rate: '₹550/hr',
      status: 'approved',
    },
  ]);

  // Admin reports queue
  const [safetyReports, setSafetyReports] = useState([
    {
      id: 'rep-1',
      reported_user: 'Vikram S.',
      reported_by: 'Ananya R. (Companion)',
      reason: 'Requested private hotel room instead of cafe',
      status: 'action_taken',
      action: 'Account Suspended for 30 days',
      timestamp: 'Today at 2:15 PM',
    },
    {
      id: 'rep-2',
      reported_user: 'User #9102',
      reported_by: 'Pooja K.',
      reason: 'Asking for outside WhatsApp transaction',
      status: 'pending_investigation',
      action: 'Safety team reviewing chat logs',
      timestamp: 'Yesterday at 6:40 PM',
    },
  ]);

  const handleApprove = (id: string) => {
    setVerificationQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
    );
  };

  const handleReject = (id: string) => {
    setVerificationQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' } : item))
    );
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
              KYC Approvals ({verificationQueue.filter((q) => q.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveSubTab('reports')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'reports'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Safety Reports ({safetyReports.length})
            </button>
            <button
              onClick={() => setActiveSubTab('bookings')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'bookings'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bookings ({bookings.length})
            </button>
          </div>
        </div>

        {/* 4 Core Admin KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Total Members</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">4,820</div>
            <p className="text-[11px] text-emerald-600 font-semibold">+142 this week</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Verified Buddies</span>
              <ShieldCheck className="w-4 h-4 text-pink-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{buddies.length + 42}</div>
            <p className="text-[11px] text-blue-600 font-semibold">Across 6 major cities</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Total Sessions</span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">1,940</div>
            <p className="text-[11px] text-slate-500">100% public venues</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Membership Revenue</span>
              <IndianRupee className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">₹24,05,180</div>
            <p className="text-[11px] text-emerald-600 font-semibold">₹499 one-time registrations</p>
          </div>
        </div>

        {/* Tab 1: KYC Verification Approvals */}
        {activeSubTab === 'verifications' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Companion KYC Verification Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Audit identity documents and video verification before companion listings go public.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {verificationQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">{item.name}</span>
                      <span className="text-xs text-slate-500">
                        ({item.city} • {item.area})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                      <span className="flex items-center">
                        <FileCheck className="w-3.5 h-3.5 text-blue-600 mr-1" />
                        {item.idType}: <strong className="ml-1">{item.idNumber}</strong>
                      </span>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium">✓ {item.videoKYC}</span>
                      <span>•</span>
                      <span className="font-bold text-pink-600">Rate: {item.rate}</span>
                    </div>
                  </div>

                  {item.status === 'pending' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Profile</span>
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                          Reported User: {rep.reported_user}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          (Filed by {rep.reported_by})
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-rose-900 mt-1">
                        Reason: {rep.reason}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {rep.timestamp}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                    <span>
                      Action: <strong>{rep.action}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Audit Logged
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: System Bookings */}
        {activeSubTab === 'bookings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xl font-black text-slate-900">
              Live Session Activity Log
            </h2>
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
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-mono font-bold text-blue-700">
                        {b.booking_code}
                      </td>
                      <td className="py-3 px-2 text-slate-800 font-medium">
                        {b.date} • {b.time}
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
          </div>
        )}
      </div>
    </div>
  );
};
