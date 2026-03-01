import { useState, useEffect } from 'react';
import api from '../api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { toast } from 'react-toastify';
import { Eye, X, Send } from 'lucide-react';
import { formatDateSafe, formatDateTimeSafe } from '../utils/date';
import { SUPPORT_ADMIN_ALL, supportAdminReply, supportAdminClose } from '../api/endpoints';
import { CHAT_BUBBLE_MAX_WIDTH } from '../config/constants';

interface Message {
    senderId: string;
    role: 'user' | 'admin';
    content: string;
    createdAt: string;
}

interface Ticket {
    id: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
    userEmail?: string;
    messages?: Message[];
}

const SupportPage = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [replyText, setReplyText] = useState('');

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const response = await api.get(SUPPORT_ADMIN_ALL);
            setTickets(response.data || []);
        } catch (error) {
            console.error('Failed to fetch tickets', error);
            toast.error('Failed to load support tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;

        try {
            await api.post(supportAdminReply(selectedTicket.id), {
                content: replyText.trim()
            });
            
            // Optimistic update
            const newMessage: Message = {
                senderId: 'admin',
                role: 'admin',
                content: replyText,
                createdAt: new Date().toISOString()
            };
            
            setSelectedTicket({
                ...selectedTicket,
                messages: [...(selectedTicket.messages || []), newMessage]
            });
            
            setReplyText('');
            toast.success('Reply sent');
        } catch {
            toast.error('Failed to send reply');
        }
    };

    const resolveTicket = async () => {
        if (!selectedTicket) return;
        try {
            await api.post(supportAdminClose(selectedTicket.id));
            toast.success('Ticket resolved');
            setSelectedTicket({ ...selectedTicket, status: 'closed' });
            fetchTickets();
        } catch {
            toast.error('Failed to resolve ticket');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        No tickets found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tickets.map((ticket) => (
                                    <TableRow key={ticket.id}>
                                        <TableCell className="font-medium">{ticket.subject}</TableCell>
                                        <TableCell>{ticket.userEmail || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={ticket.priority === 'high' ? 'danger' : 'info'}>
                                                {ticket.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={ticket.status === 'open' ? 'warning' : 'success'}>
                                                {ticket.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDateSafe(ticket.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => setSelectedTicket(ticket)}
                                            >
                                                <Eye size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            <div>
                                <h2 className="text-xl font-bold">{selectedTicket.subject}</h2>
                                <p className="text-sm text-gray-500">Ticket ID: {selectedTicket.id}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedTicket(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-gray-900">{selectedTicket.description}</p>
                            </div>

                            {/* Message Thread */}
                            <div className="space-y-4">
                                {selectedTicket.messages?.map((msg, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`${CHAT_BUBBLE_MAX_WIDTH} rounded-lg p-3 ${
                                            msg.role === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}>
                                            <p className="text-sm">{msg.content}</p>
                                            <span className="text-xs opacity-70 mt-1 block">
                                                {formatDateTimeSafe(msg.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Type a reply..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />
                                <Button onClick={handleReply}>
                                    <Send size={18} />
                                </Button>
                            </div>
                            <div className="mt-4 flex justify-end">
                                {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                                    <Button variant="success" onClick={resolveTicket}>
                                        Mark as Resolved
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportPage;
