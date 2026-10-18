import React from 'react';
import {
  History,
  Trash2,
  Download,
  FileAudio,
  Disc3,
  Clock,
  ExternalLink
} from 'lucide-react';
import { DownloadHistoryItem } from '../types';

interface DownloadHistoryProps {
  history: DownloadHistoryItem[];
  onClearHistory: () => void;
  onRemoveItem: (id: string) => void;
  onReDownload: (item: DownloadHistoryItem) => void;
}

export const DownloadHistory: React.FC<DownloadHistoryProps> = ({
  history,
  onClearHistory,
  onRemoveItem,
  onReDownload,
}) => {
  if (history.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <History className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200">
          Chưa có lịch sử tải xuống
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Các bài nhạc bạn trích xuất và tải từ MusicCreator.ai sẽ được lưu tạm tại đây để bạn có thể tải lại bất cứ khi nào.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-sky-400" />
          <h3 className="font-semibold text-slate-100 text-sm">
            Lịch sử đã tải ({history.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa tất cả</span>
        </button>
      </div>

      <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto pr-1">
        {history.map((item) => (
          <div
            key={item.id}
            className="py-3 flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={item.coverUrl}
                alt={item.title}
                className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-800"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span className="truncate">{item.artist}</span>
                  {item.platformName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-medium ${
                          item.platformName.includes('FreeMusic')
                            ? 'text-emerald-400'
                            : item.platformName.includes('MusicMaker')
                            ? 'text-amber-400'
                            : 'text-sky-400'
                        }`}
                      >
                        {item.platformName}
                      </span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className={`font-mono font-medium ${item.format === 'wav' ? 'text-indigo-400' : 'text-sky-300'}`}>
                    {item.format.toUpperCase()} ({item.size})
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onReDownload(item)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 transition-colors"
                title="Tải lại file"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Xóa mục này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
