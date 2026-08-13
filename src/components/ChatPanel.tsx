import { FormEvent, Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, X, Send } from 'lucide-react';
import { CHAT_PIDGIN_RESPONSES } from '../data';
import { UserRole, Driver, DriverRideRequest, UserProfile, Message } from '../types';

interface ChatPanelProps {
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  slangMode: boolean;
  role: UserRole;
  activeDriver: Driver | null;
  driverRideRequest: DriverRideRequest | null;
  user: UserProfile | null;
  startInAppCall: (sender: 'passenger' | 'driver') => void;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  chatInput: string;
  setChatInput: (input: string) => void;
  handleSendChat: (e: FormEvent) => void;
}

export default function ChatPanel({
  showChat,
  setShowChat,
  slangMode,
  role,
  activeDriver,
  driverRideRequest,
  user,
  startInAppCall,
  messages,
  setMessages,
  chatInput,
  setChatInput,
  handleSendChat,
}: ChatPanelProps) {
  return (
      <AnimatePresence>
        {showChat && (
          <>
            {/* Semi-transparent Backdrop overlay covering map & trip status above */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[1400] cursor-pointer"
            />

            {/* Bottom Sheet Sliding Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-[1500] w-full max-w-lg mx-auto bg-brand-midnight border-t-2 border-brand-gold/50 rounded-t-3xl shadow-[0_-12px_48px_rgba(0,0,0,0.85)] flex flex-col h-[55vh] min-h-[380px] max-h-[550px] overflow-hidden"
              id="half-screen-chat-panel"
            >
              {/* Swipe/Drag top handle */}
              <div 
                onClick={() => setShowChat(false)}
                className="w-full py-2 flex justify-center items-center cursor-pointer hover:bg-brand-card/30 transition shrink-0 group"
                title={slangMode ? "Fermer le tchat" : "Dismiss chat"}
              >
                <div className="w-12 h-1.5 bg-brand-input group-hover:bg-brand-gold rounded-full transition-colors" />
              </div>

              {/* Panel Header */}
              <div className="px-4 py-2.5 bg-brand-card border-b border-brand-input flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        role === 'passenger'
                          ? (activeDriver?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
                          : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
                      }
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-brand-gold"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-brand-card rounded-full animate-pulse" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white truncate">
                      {role === 'passenger'
                        ? (activeDriver?.name || (slangMode ? "Chauffeur Wanda" : "Wanda Driver"))
                        : (driverRideRequest?.passengerName || user?.name || "Passenger Client")}
                    </h4>
                    <p className="text-[10px] text-brand-gold font-bold">
                      {role === 'passenger' 
                        ? (activeDriver?.vehicleModel || "Taxi") 
                        : (slangMode ? "Client Wanda" : "Active Passenger")}
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons: Direct Call & Close */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startInAppCall(role === 'passenger' ? 'passenger' : 'driver')}
                    className="py-1.5 px-3 bg-brand-gold hover:bg-amber-400 text-brand-midnight font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-brand-gold/20"
                    title={slangMode ? "Lancer un appel direct" : "Call directly"}
                  >
                    <Phone size={13} className="stroke-[2.5]" />
                    <span>{slangMode ? "Appeler" : "Call"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowChat(false)}
                    className="p-1.5 text-brand-text-muted hover:text-white bg-brand-input hover:bg-brand-card border border-brand-card rounded-xl transition cursor-pointer"
                    title={slangMode ? "Fermer" : "Close"}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs bg-brand-deep/30">
                {messages.length === 0 ? (
                  <div className="text-center py-8 px-4 space-y-2">
                    <p className="text-brand-gold text-xl">💬</p>
                    <p className="text-brand-text-muted italic font-medium text-xs">
                      {role === 'passenger'
                        ? (slangMode ? "Envoie un message au djo !" : "Send a message to your driver!")
                        : (slangMode ? "Envoie un message au client !" : "Send a message to your passenger!")}
                    </p>
                  </div>
                ) : (
                  messages.map((m, index) => {
                    const isMe = (role === 'passenger' && m.sender === 'passenger') || (role === 'driver' && m.sender === 'driver');
                    return (
                      <div
                        key={index}
                        className={`flex flex-col max-w-[82%] rounded-2xl p-3 shadow-sm ${
                          isMe
                            ? 'bg-brand-gold text-brand-midnight self-end ml-auto font-bold rounded-br-none'
                            : 'bg-brand-card border border-brand-input text-white self-start mr-auto font-medium rounded-bl-none'
                        }`}
                      >
                        <p className="leading-relaxed text-xs">{m.text}</p>
                        <span className={`text-[8px] text-right mt-1 font-mono ${isMe ? 'text-brand-midnight/70' : 'text-brand-text-muted'}`}>
                          {m.timestamp}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Preset Replies */}
              <div className="px-3 py-2 bg-brand-midnight border-t border-brand-input/40 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                {(role === 'passenger' ? [
                  slangMode ? "Je suis déjà là djo !" : "I am outside!",
                  slangMode ? "Tu es où ?" : "Where are you?",
                  slangMode ? "J'arrive, attends moi stp" : "On my way, please wait!",
                  slangMode ? "Je suis au carrefour" : "I am at the carrefour"
                ] : [
                  slangMode ? "Je suis arrivé mon frère !" : "I have arrived!",
                  slangMode ? "Embouteillage sur la route" : "Heavy traffic, arriving soon!",
                  slangMode ? "Je suis garé au repère" : "Parked at pickup landmark",
                  slangMode ? "D'accord, bien reçu !" : "Okay, copy that!"
                ]).map((presetText) => (
                  <button
                    key={presetText}
                    type="button"
                    onClick={() => {
                      const mySender = role === 'passenger' ? 'passenger' : 'driver';
                      const otherSender = role === 'passenger' ? 'driver' : 'passenger';
                      const newMsg: Message = {
                        sender: mySender,
                        text: presetText,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      setMessages(prev => [...prev, newMsg]);
                      setTimeout(() => {
                        const randomPidgin = CHAT_PIDGIN_RESPONSES[Math.floor(Math.random() * CHAT_PIDGIN_RESPONSES.length)];
                        setMessages(prev => [
                          ...prev,
                          {
                            sender: otherSender,
                            text: randomPidgin,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }
                        ]);
                      }, 1400);
                    }}
                    className="text-[10px] font-bold bg-brand-input hover:bg-brand-card text-brand-gold border border-brand-card rounded-full px-3 py-1 whitespace-nowrap cursor-pointer transition shrink-0 active:scale-95"
                  >
                    {presetText}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendChat} className="p-2.5 border-t border-brand-input bg-brand-card flex gap-2 shadow-md shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={slangMode ? "Tchatter en Pidgin / Franglais..." : "Type your message..."}
                  className="flex-1 bg-brand-input border border-brand-card rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-gold focus:bg-brand-input"
                  id="driver-chat-input"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black rounded-xl cursor-pointer flex items-center justify-center transition active:scale-95 shadow-md"
                >
                  <Send size={14} className="stroke-[2.5]" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
  );
}
