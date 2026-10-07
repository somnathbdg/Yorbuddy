import React, { useEffect } from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmailVerificationPanel, PhoneVerificationPanel, KycSubmissionPanel } from '../dashboard/VerificationPanel';

export const VerificationCenterView: React.FC = () => {
  const { setActiveTab, fetchVerificationStatus, verificationStatus } = useApp();

  useEffect(() => {
    fetchVerificationStatus();
  }, [fetchVerificationStatus]);

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('user-dashboard')}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
              <span>Verification Center</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Verify your identity to use all features. Your data is secure and only visible to you and admin reviewers.
            </p>
          </div>
        </div>

        {/* Status Overview */}
        {verificationStatus && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className={`inline-block w-3 h-3 rounded-full mb-1 ${verificationStatus.email === 'verified' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <p className="text-xs font-bold text-slate-600">Email</p>
                <p className={`text-xs font-black ${verificationStatus.email === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {verificationStatus.email === 'verified' ? 'Verified' : 'Pending'}
                </p>
              </div>
              <div>
                <span className={`inline-block w-3 h-3 rounded-full mb-1 ${verificationStatus.phone === 'verified' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <p className="text-xs font-bold text-slate-600">Phone</p>
                <p className={`text-xs font-black ${verificationStatus.phone === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {verificationStatus.phone === 'verified' ? 'Verified' : 'Pending'}
                </p>
              </div>
              <div>
                <span className={`inline-block w-3 h-3 rounded-full mb-1 ${verificationStatus.kyc === 'approved' ? 'bg-emerald-500' : verificationStatus.kyc === 'pending' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                <p className="text-xs font-bold text-slate-600">KYC</p>
                <p className={`text-xs font-black ${verificationStatus.kyc === 'approved' ? 'text-emerald-600' : verificationStatus.kyc === 'pending' ? 'text-blue-600' : 'text-amber-600'}`}>
                  {verificationStatus.kyc === 'approved' ? 'Verified' : verificationStatus.kyc === 'pending' ? 'Under Review' : 'Not Submitted'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verification Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EmailVerificationPanel onStatusChange={fetchVerificationStatus} />
          <PhoneVerificationPanel onStatusChange={fetchVerificationStatus} />
          <KycSubmissionPanel onStatusChange={fetchVerificationStatus} />
        </div>
      </div>
    </div>
  );
};
