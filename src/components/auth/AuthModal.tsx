import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Calendar,
  MapPin,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowRight,
  UploadCloud,
  FileCheck,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuthModal: React.FC = () => {
  const {
    isRegisterModalOpen,
    setIsRegisterModalOpen,
    registerStep,
    setRegisterStep,
    activateMembership,
    setActiveTab,
    activities,
    currentUser,
    setCurrentUser,
    userProfile,
    setUserProfile,
  } = useApp();

  // Mode: 'register' or 'login'
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');

  // Step 1 Form Data
  const [fullName, setFullName] = useState(currentUser.full_name || 'Somnath Banerjee');
  const [email, setEmail] = useState(currentUser.email || 'somnathbdg@gmail.com');
  const [mobile, setMobile] = useState('+91 98765 43210');
  const [password, setPassword] = useState('SecurePass2026!');
  const [dob, setDob] = useState('1998-05-14');
  const [gender, setGender] = useState<'male' | 'female' | 'non-binary' | 'prefer-not-to-say'>('male');
  const [city, setCity] = useState('Pune');

  // Step 2 Form Data
  const [bio, setBio] = useState('Tech professional who loves coffee, cinema, and weekend walks.');
  const [interests, setInterests] = useState<string[]>(['Coffee', 'Movies', 'City Walks', 'Bookstores']);
  const [interestInput, setInterestInput] = useState('');
  const [languages, setLanguages] = useState<string[]>(['English', 'Hindi', 'Bengali']);
  const [selectedActivities, setSelectedActivities] = useState<string[]>(['act-1', 'act-2', 'act-5']);

  // Step 3 Verification
  const [otp, setOtp] = useState('7492');
  const [isOtpVerified, setIsOtpVerified] = useState(true);
  const [idType, setIdType] = useState<'aadhaar' | 'pan' | 'passport' | 'voter_id'>('aadhaar');
  const [idNumber, setIdNumber] = useState('XXXX-XXXX-4812');
  const [isIdUploaded, setIsIdUploaded] = useState(true);

  // Step 4 Payment
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'credit_card' | 'debit_card' | 'net_banking'>('upi');
  const [upiId, setUpiId] = useState('somnath@okhdfcbank');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [errorText, setErrorText] = useState('');

  if (!isRegisterModalOpen) return null;

  // Age validator: 18+ requirement
  const validateAge = (birthDate: string): boolean => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 18;
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAge(dob)) {
      setErrorText('You must be 18 years or older to join YorBuddy.');
      return;
    }
    setErrorText('');
    setRegisterStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterStep(3);
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterStep(4);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);

    setTimeout(() => {
      activateMembership(paymentMethod);
      setIsProcessingPayment(false);
      setIsPaymentComplete(true);
    }, 1000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegisterModalOpen(false);
    setActiveTab('user-dashboard');
  };

  const addInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput('');
    }
  };

  const removeInterest = (item: string) => {
    setInterests(interests.filter((i) => i !== item));
  };

  const toggleActivity = (actId: string) => {
    setSelectedActivities((prev) =>
      prev.includes(actId) ? prev.filter((id) => id !== actId) : [...prev, actId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header with Step Progress Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-black text-slate-900">
                {authMode === 'login' ? 'Welcome Back' : 'Join YorBuddy'}
              </span>
              {authMode === 'register' && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  Step {registerStep} of 4
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {authMode === 'login'
                ? 'Login to access your dashboard and messages'
                : '18+ Verified Platonic Companionship Platform'}
            </p>
          </div>

          <button
            onClick={() => setIsRegisterModalOpen(false)}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        {authMode === 'register' && !isPaymentComplete && (
          <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-100">
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
              <span className={registerStep >= 1 ? 'text-blue-600' : 'text-slate-400'}>
                1. Basics
              </span>
              <span className={registerStep >= 2 ? 'text-blue-600' : 'text-slate-400'}>
                2. Profile
              </span>
              <span className={registerStep >= 3 ? 'text-blue-600' : 'text-slate-400'}>
                3. Verification
              </span>
              <span className={registerStep >= 4 ? 'text-pink-600' : 'text-slate-400'}>
                4. ₹499 Fee
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-pink-500 transition-all duration-300"
                style={{ width: `${(registerStep / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 flex-1">
          {/* LOGIN MODE */}
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:underline">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-xs shadow-md shadow-blue-500/20"
              >
                Login to YorBuddy
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Don&apos;t have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setRegisterStep(1);
                  }}
                  className="text-xs font-bold text-pink-600 hover:underline"
                >
                  Join YorBuddy (₹499 One-Time)
                </button>
              </div>
            </form>
          ) : isPaymentComplete ? (
            /* PAYMENT SUCCESS STATE (Section 7) */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto text-3xl ring-8 ring-pink-50">
                🎉
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome to YorBuddy!
              </h2>
              <p className="text-sm font-semibold text-slate-600 max-w-sm mx-auto">
                “Your account is now active. Start discovering your buddies.”
              </p>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-left max-w-sm mx-auto space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Lifetime Membership Activated (₹499)</span>
                </div>
                <p className="text-emerald-700 text-[11px]">
                  No monthly recurring charges. You have unlimited access to browse verified companions across all Indian cities.
                </p>
              </div>

              <button
                id="find-my-buddy-success-btn"
                onClick={() => {
                  setIsRegisterModalOpen(false);
                  setActiveTab('find-buddy');
                }}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-black text-sm shadow-lg shadow-blue-500/25 hover:opacity-95 transition-opacity"
              >
                Find My Buddy
              </button>
            </div>
          ) : (
            /* MULTI-STEP REGISTRATION FORM */
            <div>
              {/* STEP 1: Account Basics */}
              {registerStep === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name (As per Govt ID)
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Somnath Banerjee"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Date of Birth</span>
                        <span className="text-[10px] text-pink-600 font-bold">18+ Only</span>
                      </label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        City
                      </label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                      >
                        <option value="Pune">Pune</option>
                        <option value="Bengaluru">Bengaluru</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Delhi NCR">Delhi NCR</option>
                        <option value="Hyderabad">Hyderabad</option>
                        <option value="Kolkata">Kolkata</option>
                      </select>
                    </div>
                  </div>

                  {errorText && (
                    <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      {errorText}
                    </p>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:opacity-95 transition-opacity flex items-center justify-center space-x-1"
                    >
                      <span>Continue to Profile (Step 2)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-xs text-slate-500 hover:text-blue-600"
                    >
                      Already have an account? <strong>Login</strong>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Profile Details */}
              {registerStep === 2 && (
                <form onSubmit={handleStep2Submit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Profile Photo
                    </label>
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                        alt="Profile preview"
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500"
                      />
                      <div className="text-xs text-slate-500">
                        <span className="font-bold text-slate-800 block">Clear face photo</span>
                        <span>Used for in-person verification at public meetups.</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      About Me (Bio)
                    </label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Share a short introduction about yourself and what you enjoy..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 resize-none"
                      required
                    />
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your Interests & Passions
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addInterest();
                          }
                        }}
                        placeholder="Type interest & press add (e.g. Cinema, Art, Chess)"
                        className="flex-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      />
                      <button
                        type="button"
                        onClick={addInterest}
                        className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map((item) => (
                        <span
                          key={item}
                          className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold flex items-center space-x-1"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => removeInterest(item)}
                            className="text-blue-400 hover:text-blue-700 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Activities */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Preferred Companion Activities
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1">
                      {activities.map((act) => {
                        const isSelected = selectedActivities.includes(act.id);
                        return (
                          <div
                            key={act.id}
                            onClick={() => toggleActivity(act.id)}
                            className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-2 ${
                              isSelected
                                ? 'bg-pink-50 border-pink-500 text-pink-700'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-pink-500 flex items-center justify-center text-[9px]">
                              {isSelected ? '✓' : ''}
                            </span>
                            <span className="truncate">{act.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(1)}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:opacity-95 flex items-center justify-center space-x-1"
                    >
                      <span>Continue to Verification (Step 3)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Verification */}
              {registerStep === 3 && (
                <form onSubmit={handleStep3Submit} className="space-y-4">
                  {/* Mobile OTP Verification */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                        <Smartphone className="w-4 h-4 text-blue-600" />
                        <span>Mobile OTP Verification</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ✓ OTP Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Code sent to {mobile}. (Auto-verified for instant onboarding)
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-28 p-2 rounded-lg bg-white border border-slate-300 font-mono text-center font-bold text-sm tracking-widest"
                      />
                      <span className="text-xs text-emerald-600 font-semibold flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Verified
                      </span>
                    </div>
                  </div>

                  {/* Email Verification */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Email Verified</span>
                        <span className="text-[10px] text-slate-500">{email}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Active
                    </span>
                  </div>

                  {/* Identity Document Verification */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                        <FileCheck className="w-4 h-4 text-pink-600" />
                        <span>Government Identity Verification</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                        Required
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      We verify all users to maintain a strictly safe, platonic, non-escort community.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value as any)}
                        className="p-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                      >
                        <option value="aadhaar">Aadhaar Card</option>
                        <option value="pan">PAN Card</option>
                        <option value="passport">Passport</option>
                        <option value="voter_id">Voter ID</option>
                      </select>

                      <input
                        type="text"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="Document Number"
                        className="p-2 rounded-lg bg-white border border-slate-300 text-xs font-mono"
                      />
                    </div>

                    <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-white text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                      <UploadCloud className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-slate-700">Aadhaar_Front_Verified.pdf</span>
                      <span className="text-[10px] text-emerald-600 font-bold">(Uploaded)</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(2)}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:opacity-95 flex items-center justify-center space-x-1"
                    >
                      <span>Proceed to Membership (Step 4)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: Membership Payment Page (Section 6 & 7 & 23) */}
              {registerStep === 4 && (
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  {/* Order summary */}
                  <div className="bg-gradient-to-br from-blue-50 via-white to-pink-50 p-5 rounded-3xl border border-pink-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">YorBuddy Membership</h4>
                        <p className="text-xs text-slate-500">
                          One-Time Lifetime Registration & Verification
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-900">₹499</span>
                      </div>
                    </div>

                    {/* Explicit business rule clarity: ONE-TIME, NOT monthly */}
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-semibold">
                      ⚡ Important: This ₹499 fee is a <strong>ONE-TIME REGISTRATION FEE</strong>. It is NOT monthly, weekly, or recurring.
                    </div>

                    {/* Benefits Checklist */}
                    <div className="space-y-1.5 text-xs text-slate-700 pt-1">
                      <p className="font-bold text-slate-900 mb-1">Your Member Benefits:</p>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Access verified buddies across all cities</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Discover and filter profiles by interests & activities</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Send booking requests directly</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Chat after mutual acceptance</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Secure booking system with public meeting pledge</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>24/7 Member Trust & Safety support</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-black text-slate-900">
                      <span>Total Amount:</span>
                      <span className="text-lg text-pink-600">₹499</span>
                    </div>
                  </div>

                  {/* Payment Options */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Payment Options (Sandbox Mode)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'upi', label: 'UPI' },
                          { id: 'credit_card', label: 'Credit Card' },
                          { id: 'debit_card', label: 'Debit Card' },
                          { id: 'net_banking', label: 'Net Banking' },
                        ] as const
                      ).map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                            paymentMethod === method.id
                              ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-xs'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>

                    {paymentMethod === 'upi' && (
                      <div className="mt-2 flex items-center space-x-2">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. yourname@upi"
                          className="flex-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setUpiId('demo@upi')}
                          className="px-2.5 py-2 rounded-xl text-[11px] font-bold text-blue-600 bg-blue-50"
                        >
                          Auto-Fill
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setRegisterStep(3)}
                      className="px-4 py-3.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold"
                    >
                      Back
                    </button>
                    <button
                      id="pay-membership-btn"
                      type="submit"
                      disabled={isProcessingPayment}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-500 text-white font-black text-sm shadow-lg shadow-blue-500/25 hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {isProcessingPayment ? (
                        <span className="flex items-center space-x-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Processing ₹499...</span>
                        </span>
                      ) : (
                        <span>Pay ₹499 & Activate Account</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
