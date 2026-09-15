import React, { useState } from 'react';
import {
  X,
  Send,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Flag,
  Calendar,
  Clock,
  MapPin,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ChatDrawer: React.FC = () => {
  const {
    isChatOpen,
    setIsChatOpen,
    activeChatBooking,
    activeChatBuddy,
    messages,
    sendMessage,
    currentUser,
    setIsSafetyReportModalOpen,
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  if (!isChatOpen) return null;

  const currentBooking = activeChatBooking;
  const buddy = activeChatBuddy;

  const bookingId = currentBooking ? currentBooking.id : 'general-chat';
  const chatMessages = messages.filter((m) =>
    currentBooking ? m.booking_id === currentBooking.id : true
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isBlocked) return;
    sendMessage(bookingId, inputMessage);
    setInputMessage('');
  };

  const handleBlockUser = () => {
    if (confirm('Are you sure you want to block this user? They will not be able to message you.')) {
      setIsBlocked(true);
      setShowOptionsMenu(false);
    }
  };

  const handleReportUser = () => {
    setShowOptionsMenu(false);
    setIsSafetyReportModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={
                    buddy
                      ? buddy.profile.photo_url
                      : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80'
                  }
                  alt="Buddy"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    {buddy ? buddy.user.full_name : 'Neha Sharma'}
                  </h3>
                  <span className="text-blue-600 text-xs">✓</span>
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold">
                  Online • Identity Verified
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <div className="relative">
                <button
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                  title="Safety & moderation options"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>

                {showOptionsMenu && (
                  <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30">
                    <button
                      onClick={handleReportUser}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report User</span>
                    </button>
                    <button
                      onClick={handleBlockUser}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block Companion</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsChatOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Booking Context Banner */}
          {currentBooking && (
            <div className="mt-3 p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-[11px] text-blue-900 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold">{currentBooking.date}</span>
                <span>•</span>
                <span>{currentBooking.time}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold">
                {currentBooking.booking_code}
              </span>
            </div>
          )}
        </div>

        {/* Safety Reminder Banner */}
        <div className="bg-amber-50 px-4 py-2 text-[11px] text-amber-900 border-b border-amber-200/60 flex items-center space-x-2">
          <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Safety Reminder:</strong> Meet only in public places. Do not share phone numbers or banking details.
          </span>
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {/* Encryption / Privacy Notice */}
          <div className="text-center py-2">
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-200/70 text-slate-600 text-[10px] font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Protected conversation • Phone number is kept private</span>
            </span>
          </div>

          {chatMessages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                  }`}
                >
                  <p>{msg.message}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })}

          {isBlocked && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-700 font-bold">
              You have blocked this companion. Messages cannot be sent.
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2"
        >
          <input
            type="text"
            disabled={isBlocked}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isBlocked ? 'Companion is blocked' : 'Type a message...'}
            className="flex-1 px-4 py-2.5 rounded-full bg-slate-100 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isBlocked}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25 disabled:opacity-40 hover:opacity-95 transition-opacity"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
