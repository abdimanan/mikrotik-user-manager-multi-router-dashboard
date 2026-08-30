import React from 'react';
import { RouterAlert } from '../types';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

interface AlertsModalProps {
  alerts: RouterAlert[];
  onClose: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ alerts, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-[#c2c6d3] max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-[#dbe4ed] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#ba1a1a]/10 p-2 rounded-lg text-[#ba1a1a]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141d23]">
                Fleet Health Alerts & Telemetry Events
              </h2>
              <p className="text-xs text-[#424751]">
                Real-time connection drops, CPU spikes, and authentication anomalies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#727783] hover:text-[#141d23] p-1.5 rounded-lg hover:bg-[#e6eff8]"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
          {alerts.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#727783]">
              No alerts recorded. All routers healthy.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border text-xs space-y-1.5 transition-colors ${
                  alert.severity === 'error'
                    ? 'bg-[#fffbfa] border-[#ffdad6]'
                    : alert.severity === 'warning'
                    ? 'bg-[#fffcf9] border-[#ffdbcb]'
                    : 'bg-[#f6faff] border-[#c2c6d3]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#141d23]">
                    {alert.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-[#ba1a1a]" />
                    ) : alert.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-[#8f3c00]" />
                    ) : (
                      <Info className="w-4 h-4 text-[#0054a6]" />
                    )}
                    <span>{alert.title}</span>
                  </div>
                  <span className="text-[11px] text-[#727783]">{alert.timeAgo}</span>
                </div>

                <p className="text-xs text-[#424751] leading-relaxed">
                  {alert.description}
                </p>

                {alert.publicIp && (
                  <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-[#727783]">
                    <span>Router IP: <strong>{alert.publicIp}</strong></span>
                    {alert.routerName && <span>• Name: {alert.routerName}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-[#dbe4ed]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#003d7c] hover:bg-[#0054a6] text-white rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
