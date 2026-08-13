import { useState, FormEvent } from 'react';
import { Message, UserRole } from '../types';
import { CHAT_PIDGIN_RESPONSES } from '../data';

const DRIVER_REPLIES = [
  "Ok, j'arrive !",
  "Je suis là, j'attends au bord de la route.",
  "D'accord, je vous vois.",
  "S'il vous plaît dépêchez-vous, merci !",
  "Pas de problème, je vous attends.",
  "On se voit au carrefour !"
];

const nowLabel = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * In-ride chat between passenger and driver. Simulated auto-reply for now
 * (no Firestore backing) — both sides just append to a shared local thread.
 */
export function useChat(role: UserRole) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [driverChatInput, setDriverChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);

  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const mySender = role === 'passenger' ? 'passenger' : 'driver';
    const otherSender = role === 'passenger' ? 'driver' : 'passenger';

    setMessages(prev => [...prev, { sender: mySender, text: chatInput, timestamp: nowLabel() }]);
    setChatInput('');

    setTimeout(() => {
      const responses = role === 'passenger' ? CHAT_PIDGIN_RESPONSES : DRIVER_REPLIES;
      const randomReply = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, { sender: otherSender, text: randomReply, timestamp: nowLabel() }]);
    }, 1500);
  };

  const handleSendDriverChat = (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { sender: 'driver', text, timestamp: nowLabel() }]);
    setDriverChatInput('');

    setTimeout(() => {
      const randomReply = DRIVER_REPLIES[Math.floor(Math.random() * DRIVER_REPLIES.length)];
      setMessages(prev => [...prev, { sender: 'passenger', text: randomReply, timestamp: nowLabel() }]);
    }, 1500);
  };

  return {
    messages,
    setMessages,
    chatInput,
    setChatInput,
    driverChatInput,
    setDriverChatInput,
    showChat,
    setShowChat,
    handleSendChat,
    handleSendDriverChat
  };
}
