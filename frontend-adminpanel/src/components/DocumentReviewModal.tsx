import { useState } from 'react';
import Button from './ui/Button';
import { X, Check, XCircle } from 'lucide-react';

interface DocumentReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    driverName: string;
    documents: {
        name: string;
        url: string;
        fileName?: string;
        mimeType?: string;
        status: 'pending' | 'approved' | 'rejected';
    }[];
    onApprove: (docName: string) => void;
    onReject: (docName: string) => void;
}

const DocumentReviewModal = ({ isOpen, onClose, driverName, documents, onApprove, onReject }: DocumentReviewModalProps) => {
    const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

    const getDocType = (doc: { mimeType?: string; fileName?: string; url: string }) => {
        const mime = (doc.mimeType || '').toLowerCase();
        const fileName = (doc.fileName || '').toLowerCase();
        const url = (doc.url || '').toLowerCase();

        if (mime.startsWith('image/')) return 'image';
        if (mime.includes('pdf')) return 'pdf';

        if (fileName.endsWith('.pdf') || url.includes('.pdf')) return 'pdf';
        if (fileName.match(/\.(jpg|jpeg|png|webp|gif)$/) || url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/)) return 'image';

        return 'unknown';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Review Documents: {driverName}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {documents.map((doc, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-medium text-gray-900">{doc.name}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {doc.status.toUpperCase()}
                                </span>
                            </div>

                            <div className="bg-gray-100 h-48 rounded-lg mb-4 flex items-center justify-center text-gray-400 overflow-hidden">
                                {/* Placeholder for actual image */}
                                {doc.url && getDocType(doc) === 'image' && !failedImages[doc.name] ? (
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="h-full w-full flex items-center justify-center cursor-zoom-in hover:opacity-90 transition-opacity">
                                        <img
                                            src={doc.url}
                                            alt={doc.name}
                                            className="h-full object-contain"
                                            onError={() => setFailedImages((prev) => ({ ...prev, [doc.name]: true }))}
                                        />
                                    </a>
                                ) : doc.url && getDocType(doc) === 'pdf' ? (
                                    <iframe
                                        src={doc.url}
                                        title={doc.name}
                                        className="h-full w-full"
                                    />
                                ) : doc.url ? (
                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 underline"
                                    >
                                        Open document in new tab
                                    </a>
                                ) : (
                                    <span>No Preview Available</span>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => onReject(doc.name)}
                                    disabled={doc.status === 'rejected'}
                                >
                                    <XCircle size={16} className="mr-1" /> Reject
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => onApprove(doc.name)}
                                    disabled={doc.status === 'approved'}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Check size={16} className="mr-1" /> Approve
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-end">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

export default DocumentReviewModal;
