import React from 'react';
import {
  HelpCircle,
  Link2,
  FileAudio,
  Disc3,
  Sliders,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  Music
} from 'lucide-react';

export const MusicCreatorGuide: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-slate-100 text-base">
            Hướng dẫn tải nhạc từ Suno.com, OpenMusic.ai, MusicCreator.ai &amp; FreeMusic.ai
          </h3>
        </div>
        <span className="text-xs text-teal-400 bg-teal-950/70 border border-teal-800/40 px-2.5 py-1 rounded-md">
          Hỗ trợ 4 nền tảng AI &amp; Remaster
        </span>
      </div>

      {/* 4 Supported Platforms Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Suno AI */}
        <div className="bg-slate-950 p-4 rounded-xl border border-purple-900/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Suno AI (suno.com)
            </span>
            <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800/50">
              Suno v3.5 &amp; v4
            </span>
          </div>
          <h4 className="text-xs font-semibold text-slate-200">
            Cách lấy link:
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            1. Trên <strong>suno.com</strong> hoặc <strong>suno.ai</strong>, bấm vào bài hát.<br />
            2. Bấm <strong>Share</strong> &gt; chọn <strong>Copy Link</strong> (dạng <code className="text-purple-300">suno.com/song/...</code>).<br />
            3. Dán vào ứng dụng để tải MP3 320kbps hoặc WAV PCM Master nguyên gốc từ máy chủ Suno CDN.
          </p>
        </div>

        {/* OpenMusic.ai */}
        <div className="bg-slate-950 p-4 rounded-xl border border-teal-900/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> OpenMusic.ai
            </span>
            <span className="text-[10px] bg-teal-950 text-teal-300 px-1.5 py-0.5 rounded border border-teal-800/50">
              AI Song &amp; Beats
            </span>
          </div>
          <h4 className="text-xs font-semibold text-slate-200">
            Cách lấy link:
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            1. Mở bất kỳ bài hát hoặc trang tạo nhạc trên <strong>openmusic.ai</strong>.<br />
            2. Sao chép URL từ trình duyệt hoặc link chia sẻ.<br />
            3. Dán vào ô tìm kiếm để trích xuất file MP3 (320kbps) hoặc xuất file WAV 24-bit Studio.
          </p>
        </div>

        {/* MusicCreator.ai */}
        <div className="bg-slate-950 p-4 rounded-xl border border-sky-900/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Music className="w-4 h-4" /> MusicCreator.ai
            </span>
            <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-800/50">
              Text to Song
            </span>
          </div>
          <h4 className="text-xs font-semibold text-slate-200">
            Cách lấy link:
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            1. Mở bài nhạc trên <strong>musiccreator.ai</strong>.<br />
            2. Bấm nút <strong>Share</strong> hoặc copy URL dạng <code className="text-sky-300">/track/...</code>.<br />
            3. Dán vào ô tìm kiếm để nghe thử và tải file MP3 hoặc WAV.
          </p>
        </div>

        {/* FreeMusic.ai */}
        <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Disc3 className="w-4 h-4" /> FreeMusic.ai
            </span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/50">
              Royalty-Free
            </span>
          </div>
          <h4 className="text-xs font-semibold text-slate-200">
            Cách lấy link:
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            1. Mở bài nhạc trên <strong>freemusic.ai</strong> (nhạc miễn phí thương mại).<br />
            2. Sao chép liên kết từ thanh trình duyệt hoặc nút Share.<br />
            3. Dán vào ứng dụng để tải trọn vẹn chất lượng cao nhất về máy.
          </p>
        </div>
      </div>

      {/* Remaster Auto-Leveling Feature Highlight */}
      <div className="bg-gradient-to-r from-amber-950/40 to-slate-950 p-5 rounded-xl border border-amber-900/50 space-y-3">
        <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Chức năng Remaster: Tự động cân bằng đoạn nhỏ to ngang đoạn lớn
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          Nhiều bài hát AI thường gặp tình trạng đoạn mở đầu (intro) hoặc đoạn lời (verse) có âm lượng quá nhỏ, sau đó điệp khúc (chorus) lại bùng nổ quá to gây chênh lệch âm lượng lớn.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-lg border border-amber-900/30">
            <span className="font-semibold text-amber-300 block mb-1">Cân bằng Vừa (+6dB)</span>
            <p className="text-slate-400">Tự động nhận diện những đoạn nhỏ và nâng êm ái lên +6dB, giữ trọn cảm xúc tự nhiên và loại bỏ tạp âm nền.</p>
          </div>
          <div className="p-3 bg-slate-900/80 rounded-lg border border-amber-900/30">
            <span className="font-semibold text-amber-300 block mb-1">Cân bằng Mạnh (+12dB)</span>
            <p className="text-slate-400">Đẩy toàn bộ các phân đoạn nhỏ lên to ngang bằng đoạn lớn nhất, có bộ giới hạn True Peak Limiter chống méo tiếng tuyệt đối.</p>
          </div>
        </div>
      </div>

      {/* 3 Step Workflow */}
      <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-3">
        <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
          <Zap className="w-4 h-4 text-sky-400" />
          Quy trình tải 3 bước đơn giản
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
            <span className="font-semibold text-slate-200 block">Bước 1: Dán link</span>
            <p className="text-slate-400">Dán bất kỳ link nào từ MusicCreator.ai, FreeMusic.ai hoặc Suno.com. Hoặc bấm chọn nhanh các bài mẫu có sẵn.</p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
            <span className="font-semibold text-slate-200 block">Bước 2: Nghe &amp; Tùy chỉnh</span>
            <p className="text-slate-400">Nghe thử trên sóng âm trực quan, đo lại BPM &amp; Tone chuẩn, chọn chế độ Remaster cân bằng âm lượng, hoặc cắt đoạn.</p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
            <span className="font-semibold text-slate-200 block">Bước 3: Tải MP3 hoặc WAV</span>
            <p className="text-slate-400">Nhấn tải MP3 320kbps tốc độ cao hoặc WAV Lossless PCM 16-bit / 24-bit chuẩn phòng thu.</p>
          </div>
        </div>
      </div>

      {/* MP3 vs WAV comparison breakdown */}
      <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-3">
        <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Nên chọn tải định dạng nào: MP3 hay WAV?
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 border-l-2 border-sky-500 pl-3">
            <span className="font-bold text-sky-400 flex items-center gap-1.5">
              <FileAudio className="w-4 h-4" /> Định dạng MP3 (320 kbps High Quality)
            </span>
            <ul className="text-slate-400 space-y-1">
              <li>• Dung lượng nhẹ (~4MB - 7MB) tiết kiệm bộ nhớ điện thoại &amp; máy tính.</li>
              <li>• Tương thích 100% tất cả thiết bị phát nhạc và phần mềm dựng video (CapCut, Premiere, TikTok, YouTube Shorts).</li>
              <li>• Phù hợp: Nghe nhạc thường ngày, làm nhạc nền video, lưu trữ thư viện nhạc lớn.</li>
            </ul>
          </div>

          <div className="space-y-1.5 border-l-2 border-indigo-500 pl-3">
            <span className="font-bold text-indigo-400 flex items-center gap-1.5">
              <Disc3 className="w-4 h-4" /> Định dạng WAV (Lossless PCM 16-bit / 24-bit)
            </span>
            <ul className="text-slate-400 space-y-1">
              <li>• Âm thanh nguyên bản không nén (Uncompressed) độ chi tiết tuyệt đối.</li>
              <li>• Giữ nguyên toàn bộ dải tần số cao và dải siêu trầm (sub-bass) mà thuật toán nén MP3 thường cắt bớt.</li>
              <li>• Phù hợp: Producer, DJ, Beatmaker làm nhạc trong FL Studio, Ableton Live, Logic Pro, thu âm ca sĩ.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
