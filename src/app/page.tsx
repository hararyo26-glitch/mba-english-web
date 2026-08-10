import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-3">
      <Link
        href="/dictation"
        className="block rounded-xl border border-slate-700 bg-slate-800/60 hover:border-sky-400 p-5 transition-colors"
      >
        <p className="font-semibold text-slate-100 text-lg">🎧 ディクテーション</p>
        <p className="text-sm text-slate-400 mt-1">
          BBC/FT/TEDの実音源で聞き取り練習。間違えたセンテンスは復習リストに自動登録
        </p>
      </Link>
      <Link
        href="/composition"
        className="block rounded-xl border border-slate-700 bg-slate-800/60 hover:border-sky-400 p-5 transition-colors"
      >
        <p className="font-semibold text-slate-100 text-lg">✍️ 瞬間英作文</p>
        <p className="text-sm text-slate-400 mt-1">
          MTG発言・反論などのビジネス構文を制限時間内に英作文し、AIが採点
        </p>
      </Link>
    </div>
  );
}
