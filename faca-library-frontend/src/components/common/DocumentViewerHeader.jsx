import { FileText, FolderOpen } from 'lucide-react';

/**
 * DocumentViewerHeader — header khung xem PowerPoint (SlideSearchPage).
 * Dung lucide-react (FileText / FolderOpen) vi frontend hien tai chua cai
 * react-icons (chi co lucide-react trong package.json).
 *
 * Layout: flex ngang, space-between, padding 12px 16px, nen trang, vien duoi.
 *  - Trai : [icon + ten file]
 *  - Phai : Slide N / [icon folder + ten file]
 *
 * Da bo loi tat mo ra ngoai trinh duyet (nut "Mo tab moi" va "Office Online
 * Viewer"): slide chi duoc xem bang PdfViewer (PDF convert) hoac anh render.
 */
export const DocumentViewerHeader = ({
    fileName,
    folderName = '',
    slideTitle = 'Slide 1',
}) => {
    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 gap-3">
            {/* Cum thong tin file ben trai */}
            <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-gray-800 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900 truncate max-w-lg" title={fileName}>
                    {fileName}
                </h3>
            </div>

            {/* Cum thu muc & slide ben phai */}
            <div className="flex flex-col items-end gap-1 text-xs flex-shrink-0">
                <span className="text-gray-500">{slideTitle}</span>
                <div className="flex items-center gap-1.5 text-gray-700 font-medium min-w-0">
                    <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate max-w-xs" title={folderName || fileName}>
                        {folderName || fileName}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DocumentViewerHeader;
