import React from 'react';
import { VoucherBatch } from '../types';
import { Printer, Wifi, Ticket } from 'lucide-react';

interface VoucherPrintModalProps {
  batch: VoucherBatch;
  onClose: () => void;
}

export const VoucherPrintModal: React.FC<VoucherPrintModalProps> = ({ batch, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-xl border border-[#c2c6d3] max-w-4xl w-full p-6 shadow-2xl space-y-5 my-8 print:shadow-none print:border-none print:m-0 print:p-2">
        {/* Header - Hidden on Print */}
        <div className="flex items-center justify-between border-b border-[#dbe4ed] pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#003d7c]" />
            <div>
              <h2 className="text-lg font-bold text-[#141d23]">
                Print Voucher Sheet — {batch.batchName}
              </h2>
              <p className="text-xs text-[#424751]">
                {batch.vouchers.length} vouchers ({batch.profile} • {batch.timeLimit} • ${batch.price.toFixed(2)})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#003d7c] hover:bg-[#0054a6] text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Page</span>
            </button>
            <button
              onClick={onClose}
              className="text-[#727783] hover:text-[#141d23] p-2 rounded-lg hover:bg-[#e6eff8]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Grid of Vouchers */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 max-h-[65vh] overflow-y-auto print:max-h-none print:overflow-visible pr-1">
          {batch.vouchers.map((v, idx) => (
            <div
              key={idx}
              className="border-2 border-dashed border-[#003d7c]/40 rounded-xl p-3.5 bg-white flex flex-col justify-between gap-2.5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-[#dbe4ed] pb-1.5">
                <div className="flex items-center gap-1.5 text-[#003d7c]">
                  <Wifi className="w-4 h-4" />
                  <span className="font-bold text-xs tracking-tight">HIGH-SPEED WI-FI</span>
                </div>
                <span className="font-bold text-xs text-[#006e25] font-mono">
                  ${v.price.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-[10px] text-[#727783] uppercase block font-semibold">
                    Voucher Code
                  </span>
                  <span className="font-mono text-base font-bold text-[#141d23] tracking-widest">
                    {v.code}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#727783] uppercase block font-semibold">
                    PIN
                  </span>
                  <span className="font-mono text-sm font-bold text-[#0054a6]">
                    {v.pin}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-[#424751] bg-[#f6faff] p-1.5 rounded border border-[#dbe4ed]">
                <span>⏱️ {v.timeLimit}</span>
                <span>📶 {v.dataLimitFormatted}</span>
                <span className="font-semibold text-[#003d7c]">{v.profile}</span>
              </div>

              <div className="text-[9px] text-center text-[#727783]">
                Connect to SSID: <strong>Guest_WiFi</strong> & enter voucher
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
