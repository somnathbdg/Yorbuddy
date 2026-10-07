import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  AlertCircle,
  FileCheck,
  Eye,
} from 'lucide-react';
import { userService, KycSubmission } from '../../services/user';

// ============================================================================
// Email Verification Panel
// ============================================================================

interface EmailVerificationProps {
  onStatusChange?: () => void;
}

export const EmailVerificationPanel: React.FC<EmailVerificationProps> = ({ onStatusChange }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await userService.getVerificationStatus();
      setIsVerified(status.email === 'verified');
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    setIsSendingCode(true);
    setMessage(null);
    setDevCode(null);
    try {
      const res = await userService.requestEmailCode();
      setMessage({ type: 'success', text: res.message });
      if (res.dev_code) {
        setDevCode(res.dev_code);
      }
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setMessage({ type: 'error', text: apiError?.message || 'Failed to send code.' });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a 6-digit code.' });
      return;
    }
    setIsVerifying(true);
    setMessage(null);
    try {
      await userService.verifyEmail(code);
      setIsVerified(true);
      setMessage({ type: 'success', text: 'Email verified successfully!' });
      onStatusChange?.();
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setMessage({ type: 'error', text: apiError?.message || 'Invalid or expired code.' });
    } finally {
      setIsVerifying(false);
      setCode('');
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isVerified ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Mail className={`w-5 h-5 ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Email Verification</h4>
            <p className="text-xs text-slate-500">Verify your email address</p>
          </div>
        </div>
        {isVerified ? (
          <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Verified
          </span>
        ) : (
          <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Unverified
          </span>
        )}
      </div>

      {!isVerified && (
        <>
          {!devCode ? (
            <button
              onClick={handleSendCode}
              disabled={isSendingCode}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
            >
              {isSendingCode ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isSendingCode ? 'Sending...' : 'Send Verification Code'}</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-700 font-semibold mb-2">Enter the 6-digit code:</p>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-[10px] text-blue-600 mt-2 text-center">
                  Dev mode — code: <span className="font-mono font-bold">{devCode}</span>
                </p>
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying || code.length !== 6}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>{isVerifying ? 'Verifying...' : 'Verify Email'}</span>
              </button>

              <button
                onClick={() => { setDevCode(null); setCode(''); }}
                className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Resend Code
              </button>
            </div>
          )}
        </>
      )}

      {message && (
        <div className={`p-3 rounded-xl flex items-start space-x-2 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-xs font-medium ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {message.text}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Phone Verification Panel
// ============================================================================

interface PhoneVerificationProps {
  onStatusChange?: () => void;
}

export const PhoneVerificationPanel: React.FC<PhoneVerificationProps> = ({ onStatusChange }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await userService.getVerificationStatus();
      setIsVerified(status.phone === 'verified');
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number (min 10 digits).' });
      return;
    }
    setIsSendingCode(true);
    setMessage(null);
    setDevCode(null);
    try {
      const res = await userService.requestPhoneCode(phone);
      setMessage({ type: 'success', text: res.message });
      setDevCode(res.dev_code || null);
      setShowPhoneInput(false);
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setMessage({ type: 'error', text: apiError?.message || 'Failed to send OTP.' });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a 6-digit code.' });
      return;
    }
    setIsVerifying(true);
    setMessage(null);
    try {
      await userService.verifyPhone(code);
      setIsVerified(true);
      setMessage({ type: 'success', text: 'Phone verified successfully!' });
      onStatusChange?.();
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setMessage({ type: 'error', text: apiError?.message || 'Invalid or expired code.' });
    } finally {
      setIsVerifying(false);
      setCode('');
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isVerified ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Phone className={`w-5 h-5 ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Phone Verification</h4>
            <p className="text-xs text-slate-500">Verify your phone number</p>
          </div>
        </div>
        {isVerified ? (
          <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Verified
          </span>
        ) : (
          <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Unverified
          </span>
        )}
      </div>

      {!isVerified && (
        <>
          {showPhoneInput ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 15))}
                  placeholder="+91XXXXXXXXXX"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <button
                onClick={handleSendCode}
                disabled={isSendingCode || phone.length < 10}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
              >
                {isSendingCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSendingCode ? 'Sending...' : 'Send OTP'}</span>
              </button>
              <button
                onClick={() => setShowPhoneInput(false)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Cancel
              </button>
            </div>
          ) : devCode ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-700 font-semibold mb-2">Enter the 6-digit OTP:</p>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-[10px] text-blue-600 mt-2 text-center">
                  Dev mode — OTP: <span className="font-mono font-bold">{devCode}</span>
                </p>
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying || code.length !== 6}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>{isVerifying ? 'Verifying...' : 'Verify Phone'}</span>
              </button>

              <button
                onClick={() => { setDevCode(null); setShowPhoneInput(true); setCode(''); }}
                className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Resend OTP
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPhoneInput(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center space-x-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Send OTP</span>
            </button>
          )}
        </>
      )}

      {message && (
        <div className={`p-3 rounded-xl flex items-start space-x-2 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-xs font-medium ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {message.text}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// KYC Submission Panel
// ============================================================================

interface KycSubmissionProps {
  onStatusChange?: () => void;
}

const DOC_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
] as const;

export const KycSubmissionPanel: React.FC<KycSubmissionProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<'not_submitted' | 'pending' | 'approved' | 'rejected'>('not_submitted');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [docType, setDocType] = useState<'aadhaar' | 'pan' | 'passport' | 'voter_id'>('aadhaar');
  const [docFrontUrl, setDocFrontUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await userService.getMyKycStatus();
      if (res.data && res.data.status) {
        setStatus(res.data.status as any);
        setRejectionReason(res.data.rejection_reason || null);
      } else {
        setStatus('not_submitted');
        setRejectionReason(null);
      }
    } catch {
      // On error, default to not_submitted so user can still submit
      setStatus('not_submitted');
      setRejectionReason(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSubmit = async () => {
    // Validation
    if (!docFrontUrl || !selfieUrl) {
      setMessage({ type: 'error', text: 'Please provide both document URL and selfie URL.' });
      return;
    }
    if (!docFrontUrl.startsWith('http')) {
      setMessage({ type: 'error', text: 'Document URL must be a valid URL starting with http(s)://' });
      return;
    }
    if (!selfieUrl.startsWith('http')) {
      setMessage({ type: 'error', text: 'Selfie URL must be a valid URL starting with http(s)://' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const payload: KycSubmission = {
      doc_type: docType,
      doc_front_url: docFrontUrl,
      selfie_url: selfieUrl,
    };

    try {
      const res = await userService.submitKyc(payload);
      setStatus('pending');
      setMessage({ type: 'success', text: res.message });
      setShowForm(false);
      setDocFrontUrl('');
      setSelfieUrl('');
      onStatusChange?.();
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setMessage({ type: 'error', text: apiError?.message || 'Failed to submit KYC.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBadge = () => {
    if (status === 'approved') {
      return (
        <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Approved
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          Pending Review
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="flex items-center text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full">
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Rejected
        </span>
      );
    }
    // not_submitted
    return (
      <span className="flex items-center text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
        <XCircle className="w-3.5 h-3.5 mr-1" />
        Not Submitted
      </span>
    );
  };

  const renderActionButton = () => {
    if (showForm) return null;
    
    if (status === 'approved') {
      return (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center space-x-2 transition-all"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>View KYC Status</span>
        </button>
      );
    }
    if (status === 'pending') {
      return (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold flex items-center justify-center space-x-2 transition-all"
        >
          <Loader2 className="w-4 h-4" />
          <span>View KYC Status</span>
        </button>
      );
    }
    if (status === 'rejected') {
      return (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center space-x-2 transition-all"
        >
          <FileCheck className="w-4 h-4" />
          <span>Resubmit KYC</span>
        </button>
      );
    }
    // not_submitted
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center space-x-2 transition-all"
      >
        <FileCheck className="w-4 h-4" />
        <span>Submit KYC Documents</span>
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'approved' ? 'bg-emerald-100' : status === 'rejected' ? 'bg-rose-100' : 'bg-blue-100'}`}>
            <FileCheck className={`w-5 h-5 ${status === 'approved' ? 'text-emerald-600' : status === 'rejected' ? 'text-rose-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">KYC Verification</h4>
            <p className="text-xs text-slate-500">Identity document verification</p>
          </div>
        </div>
        {renderBadge()}
      </div>

      {status === 'rejected' && rejectionReason && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-700">Rejection Reason:</p>
              <p className="text-xs text-rose-600 mt-0.5">{rejectionReason}</p>
            </div>
          </div>
        </div>
      )}

      {status === 'pending' && !showForm && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700 font-medium">
            Your KYC submission is under review. You will be notified once approved.
          </p>
        </div>
      )}

      {status === 'approved' && !showForm && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-xs text-emerald-700 font-medium">
            Your identity has been verified. You now have full access to all platform features.
          </p>
        </div>
      )}

      {renderActionButton()}

      {showForm && status === 'pending' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            <span className="text-sm font-bold text-amber-800">KYC Under Review</span>
          </div>
          <p className="text-xs text-amber-700">
            Your KYC submission is being reviewed by our team. This typically takes 24-48 hours.
          </p>
          <button
            onClick={() => setShowForm(false)}
            className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium"
          >
            Close
          </button>
        </div>
      )}

      {showForm && status === 'approved' && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-800">KYC Approved</span>
          </div>
          <p className="text-xs text-emerald-700">
            Your identity has been verified. You have full access to all platform features.
          </p>
          <button
            onClick={() => setShowForm(false)}
            className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Close
          </button>
        </div>
      )}

      {showForm && (status === 'not_submitted' || status === 'rejected') && (
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {DOC_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Select the type of government-issued ID you want to verify with.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Document Front Image URL</label>
            <input
              type="url"
              value={docFrontUrl}
              onChange={(e) => setDocFrontUrl(e.target.value)}
              placeholder="https://your-storage.com/doc-front.jpg"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Upload your document to a cloud storage service and paste the public URL here.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Selfie Image URL</label>
            <input
              type="url"
              value={selfieUrl}
              onChange={(e) => setSelfieUrl(e.target.value)}
              placeholder="https://your-storage.com/selfie.jpg"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              A clear selfie photo for identity matching with your document.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-start space-x-2">
              <Eye className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700">
                We do NOT store your document images. Only URLs to externally hosted images are saved. Do NOT enter your Aadhaar/PAN/passport number — only upload the image URL.
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-pink-600 hover:from-blue-700 hover:to-pink-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Submit for Verification</span>
              </>
            )}
          </button>

          {status !== 'rejected' && (
            <button
              onClick={() => setShowForm(false)}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-xl flex items-start space-x-2 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-xs font-medium ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {message.text}
          </p>
        </div>
      )}
    </div>
  );
};
