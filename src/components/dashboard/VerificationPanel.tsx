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
  { value: 'pan', label: 'PAN Card' },
  { value: 'driving_license', label: 'Driving Licence' },
  { value: 'voter_id', label: 'Voter ID' },
] as const;

export const KycSubmissionPanel: React.FC<KycSubmissionProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<'not_submitted' | 'pending' | 'approved' | 'rejected'>('not_submitted');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [docType, setDocType] = useState<'pan' | 'driving_license' | 'voter_id'>('pan');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await userService.getMyKycStatus();
      setStatus(res.data?.status || 'not_submitted');
      setRejectionReason(res.data?.rejection_reason || null);
    } catch {
      setMessage({ type: 'error', text: 'Unable to load KYC status. Please refresh and try again.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const validateFile = (file: File, kind: 'document' | 'selfie') => {
    const allowed = kind === 'document' ? ['image/jpeg', 'image/png', 'application/pdf'] : ['image/jpeg', 'image/png'];
    return allowed.includes(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024;
  };

  const handleSubmit = async () => {
    if (!documentFile || !selfieFile) {
      setMessage({ type: 'error', text: 'Please select both an identity document and a selfie.' });
      return;
    }
    if (!validateFile(documentFile, 'document') || !validateFile(selfieFile, 'selfie')) {
      setMessage({ type: 'error', text: 'Document: JPG, PNG or PDF. Selfie: JPG or PNG. Each file must be 5 MB or smaller.' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const document = await userService.uploadKycFile(documentFile, 'document');
      const selfie = await userService.uploadKycFile(selfieFile, 'selfie');
      const res = await userService.submitKyc({
        doc_type: docType,
        document_path: document.object_path,
        selfie_path: selfie.object_path,
      });
      setStatus('pending');
      setMessage({ type: 'success', text: res.message });
      setShowForm(false);
      setDocumentFile(null);
      setSelfieFile(null);
      onStatusChange?.();
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setMessage({ type: 'error', text: apiError?.message || 'KYC upload or submission failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-center"><Loader2 className="w-5 h-5 text-blue-600 animate-spin" /><span className="ml-2 text-sm text-slate-500">Loading KYC status...</span></div>;

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div><h4 className="text-sm font-bold text-slate-900">KYC Verification</h4><p className="text-xs text-slate-500">18+ • Manual identity review • Private document storage</p></div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${status === 'approved' ? 'bg-emerald-50 text-emerald-700' : status === 'pending' ? 'bg-amber-50 text-amber-700' : status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{status.replace('_', ' ')}</span>
      </div>
      {status === 'pending' && <p className="p-3 rounded-xl bg-amber-50 text-xs text-amber-800">Your documents are awaiting manual admin review.</p>}
      {status === 'approved' && <p className="p-3 rounded-xl bg-emerald-50 text-xs text-emerald-800">Your KYC has been approved.</p>}
      {status === 'rejected' && rejectionReason && <p className="p-3 rounded-xl bg-rose-50 text-xs text-rose-700">Reason: {rejectionReason}</p>}
      {status !== 'pending' && status !== 'approved' && !showForm && <button onClick={() => setShowForm(true)} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">{status === 'rejected' ? 'Resubmit KYC' : 'Upload KYC Documents'}</button>}
      {showForm && status !== 'pending' && status !== 'approved' && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Identity document</label><select value={docType} onChange={e => setDocType(e.target.value as typeof docType)} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-sm">{DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Document image / PDF (max 5 MB)</label><input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => setDocumentFile(e.target.files?.[0] || null)} className="w-full text-sm" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Clear selfie (max 5 MB)</label><input type="file" accept="image/jpeg,image/png" onChange={e => setSelfieFile(e.target.files?.[0] || null)} className="w-full text-sm" /></div>
          <p className="text-[11px] text-slate-500">Your files are submitted for private storage and manual review. Do not enter your document number in this form.</p>
          <button onClick={handleSubmit} disabled={isSubmitting || !documentFile || !selfieFile} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">{isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading securely...</> : <><ShieldCheck className="w-4 h-4" />Submit for verification</>}</button>
          <button onClick={() => setShowForm(false)} className="w-full py-2 text-xs text-slate-500">Cancel</button>
        </div>
      )}
      {message && <div className={`p-3 rounded-xl text-xs ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{message.text}</div>}
    </div>
  );
};
