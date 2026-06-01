'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  user: { email: string };
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  const socketRef = useRef<Socket | null>(null);
  const selectedEmployeeRef = useRef<Employee | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Keep ref in sync with state
  useEffect(() => {
    selectedEmployeeRef.current = selectedEmployee;
  }, [selectedEmployee]);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio notification failed (usually requires user interaction first)', e);
    }
  };

  useEffect(() => {
    const savedMessages = localStorage.getItem('chat_history');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to parse local chat history', e);
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const empId = localStorage.getItem('employeeId');
    if (!token || !empId) {
      router.push('/login');
      return;
    }
    setMyEmployeeId(empId);

    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/employees`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEmployees(data.filter((e: Employee) => e.id !== empId));
        }
      })
      .catch(err => console.error(err));

    const socketUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.hostname}:5000`
      : '';
    socketRef.current = io(socketUrl);
    socketRef.current.emit('register', { employeeId: empId });

    socketRef.current.on('newMessage', (msg: Message) => {
      console.log('New message received:', msg);
      
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg]; 
      });

      // Notify if sender is not currently selected
      const current = selectedEmployeeRef.current;
      if (!current || current.id !== msg.senderId) {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1
        }));
        playNotificationSound();
        console.log(`Incremented unread for ${msg.senderId}`);
      }
    });

    socketRef.current.on('messageSent', (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [router]);

  useEffect(() => {
    if (selectedEmployee) {
      setUnreadCounts(prev => ({
        ...prev,
        [selectedEmployee.id]: 0
      }));
    }
  }, [selectedEmployee]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedEmployee]);

  useEffect(() => {
    if (selectedEmployee && myEmployeeId) {
      const token = localStorage.getItem('token');
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/chat/${selectedEmployee.id}?currentEmployeeId=${myEmployeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
             setMessages(prev => {
               const newMsgs = [...prev];
               data.forEach((m: Message) => {
                 if (!newMsgs.find(old => old.id === m.id)) {
                   newMsgs.push(m);
                 }
               });
               return newMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
             });
          }
        })
        .catch(err => console.error(err));
    }
  }, [selectedEmployee, myEmployeeId]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedEmployee || !myEmployeeId) return;

    socketRef.current?.emit('privateMessage', {
      senderId: myEmployeeId,
      receiverId: selectedEmployee.id,
      content: inputMessage
    });

    setInputMessage('');
  };

  const filteredMessages = messages.filter(m => 
    (m.senderId === myEmployeeId && m.receiverId === selectedEmployee?.id) ||
    (m.senderId === selectedEmployee?.id && m.receiverId === myEmployeeId)
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - Hidden on mobile if employee selected */}
      <div className={`
        ${selectedEmployee ? 'hidden' : 'flex'} 
        md:flex w-full md:w-1/3 md:max-w-sm bg-white border-r border-gray-200 flex-col
      `}>
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Chat Directory</h2>
          <button onClick={() => router.push('/employee/tracking')} className="text-sm text-blue-600 hover:underline">Back</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {employees.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No colleagues found</div>
          ) : (
            employees.map(emp => (
              <div 
                key={emp.id} 
                onClick={() => setSelectedEmployee(emp)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition flex justify-between items-center ${selectedEmployee?.id === emp.id ? 'bg-blue-100' : ''}`}
              >
                <div>
                  <div className="font-semibold text-gray-800">{emp.firstName} {emp.lastName}</div>
                  <div className="text-sm text-gray-500 truncate">{emp.user.email}</div>
                </div>
                {unreadCounts[emp.id] > 0 && (
                  <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-bounce">
                    {unreadCounts[emp.id]}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area - Full screen on mobile if employee selected */}
      <div className={`
        ${selectedEmployee ? 'flex' : 'hidden'} 
        md:flex flex-1 flex-col h-full bg-white
      `}>
        {selectedEmployee ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm flex items-center">
              <button 
                onClick={() => setSelectedEmployee(null)} 
                className="mr-3 md:hidden text-blue-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                {selectedEmployee.firstName[0]}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {filteredMessages.length === 0 ? (
                <div className="text-center text-gray-400 mt-10 text-sm">No messages yet. Say hi!</div>
              ) : (
                filteredMessages.map(msg => {
                  const isMe = msg.senderId === myEmployeeId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] md:max-w-md p-3 rounded-lg shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'}`}>
                        <div className="break-words">{msg.content}</div>
                        <div className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'} ${isMe ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 md:p-4 bg-white border-t border-gray-200">
              <form onSubmit={sendMessage} className="flex space-x-2">
                <input 
                  type="text" 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type message..." 
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                />
                <button 
                  type="submit" 
                  disabled={!inputMessage.trim()}
                  className="bg-blue-600 text-white rounded-full px-4 md:px-6 py-2 font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400 flex-col">
            <span className="text-5xl mb-4">💬</span>
            <span className="text-lg font-medium">Select a colleague to start chatting</span>
            <p className="text-sm">Click on a name from the list to view messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
