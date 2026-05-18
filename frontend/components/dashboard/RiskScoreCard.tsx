import type { RiskGrade, RiskStatus } from "@/types";

interface Props {
  score:    number;
  grade:    RiskGrade;
  status:   RiskStatus;
  scanTime: string;
}

const STATUS_CLASS: Record<RiskStatus, string> = {
  "Low Risk":    "status-pass",
  "Medium Risk": "status-warn",
  "High Risk":   "status-fail",
};

const STATUS_LABEL: Record<RiskStatus, string> = {
  "Low Risk":    "[OK] Low risk",
  "Medium Risk": "[!!] Medium risk",
  "High Risk":   "[!!] High risk",
};

export function RiskScoreCard({ score, grade, status, scanTime }: Props) {
  const ts = new Date(scanTime);
  const elapsed = `${ts.getHours().toString().padStart(2, "0")}:${ts.getMinutes().toString().padStart(2, "0")}:${ts.getSeconds().toString().padStart(2, "0")}`;

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] p-5 flex flex-col justify-between relative overflow-hidden h-full group">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h2 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Risk Score
        </h2>
        <span className="font-mono text-[11px] text-white/70">[METRIC]</span>
      </div>

      {/* Score + Grade */}
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono font-bold text-secondary-fixed leading-none" style={{ fontSize: "3rem" }}>
            {score}
            <span className="text-primary-fixed/60 text-2xl font-normal">/100</span>
          </div>
          <div className="font-mono text-[11px] uppercase mt-2 text-[#d7e8ff]/65">
            &gt; T: {elapsed}
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono font-bold text-white mb-2" style={{ fontSize: "3rem" }}>
            [{grade}]
          </div>
          <span className={`status-badge ${STATUS_CLASS[status]} font-mono text-[11px] uppercase`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      {/* Decorative watermark */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none select-none group-hover:opacity-[0.07] transition-opacity">
        <span className="font-mono font-bold text-primary-fixed" style={{ fontSize: "8rem" }}>
          [{grade}]
        </span>
      </div>
    </div>
  );
}
