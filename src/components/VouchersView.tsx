import React, { useState, useEffect } from 'react';
import { RouterRecord, VoucherBatch } from '../types';
import { Ticket, Plus, Printer, Check, Copy, QrCode } from 'lucide-react';
import { api } from '../api';

interface VouchersViewProps {
  routers: RouterRecord[];
  selectedRouterId?: string;
  canMutate: boolean;
  onOpenPrintModal: (batch: VoucherBatch) => void;
}

export const VouchersView: React.FC<VouchersViewProps> = ({
  routers,
  selectedRouterId,
  canMutate,
  onOpenPrintModal
}) => {
  const [activeRouterId, setActiveRouterId] = useState<string>(
    selectedRouterId || (routers[0]?.id || '')
  );
  const [batches, setBatches] = useState<VoucherBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    batchName: 'Cafe-Vouchers',
    profile: 'Guest-1Hour',
    quantity: '20',
    codeLength: '6',
    prefix: 'WIFI',
    price: '2.50',
    timeLimit: '1h',
    dataLimitMb: '1024'
  });

  const fetchVouchers = async () => {
    if (!activeRouterId) return;
    setLoading(true);
    try {
      const res = await api.getRouterVouchers(activeRouterId);
      setBatches(res);
    } catch (e) {
      console.error('Error fetching vouchers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRouterId) setActiveRouterId(selectedRouterId);
  }, [selectedRouterId]);

  useEffect(() => {
    if (activeRouterId) fetchVouchers();
  }, [activeRouterId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.generateVouchers(activeRouterId, {
        batchName: formData.batchName,
        profile: formData.profile,
        quantity: parseInt(formData.quantity, 10),
        codeLength: parseInt(formData.codeLength, 10),
        prefix: formData.prefix,
        price: parseFloat(formData.price),
        timeLimit: formData.timeLimit,
        dataLimitMb: parseInt(formData.dataLimitMb, 10)
      });
      setShowGenerateModal(false);
      fetchVouchers();
    } catch (err) {
      console.error('Failed to generate vouchers', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col space-y-5 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c2c6d3] pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#141d23] tracking-tight flex items-center gap-2">
            <Ticket className="w-7 h-7 text-[#003d7c]" />
            <span>Voucher Studio</span>
          </h1>
          <p className="text-xs md:text-sm text-[#424751] mt-0.5">
            Generate, print, and distribute hotspot access vouchers
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#c2c6d3] rounded-lg shadow-xs">
            <span className="text-xs text-[#727783] font-medium">Target Router:</span>
            <select
              value={activeRouterId}
              onChange={(e) => setActiveRouterId(e.target.value)}
              className="text-xs md:text-sm font-semibold text-[#003d7c] bg-transparent focus:outline-none cursor-pointer"
            >
              {routers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.publicIp})
                </option>
              ))}
            </select>
          </div>

          {canMutate && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#003d7c] text-white rounded-lg text-sm font-semibold hover:bg-[#0054a6] transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Vouchers</span>
            </button>
          )}
        </div>
      </div>

      {/* Batches List */}
      {batches.length === 0 ? (
        <div className="bg-white border border-[#c2c6d3] rounded-xl p-12 text-center max-w-lg mx-auto my-6 shadow-xs">
          <Ticket className="w-12 h-12 text-[#727783] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#141d23]">No Voucher Batches</h3>
          <p className="text-sm text-[#424751] mt-1 mb-6">
            Create your first batch of Wi-Fi vouchers with custom speed & time limitations.
          </p>
          {canMutate && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-[#003d7c] hover:bg-[#0054a6] text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Vouchers</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="bg-white border border-[#c2c6d3] rounded-xl p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dbe4ed] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#141d23]">{batch.batchName}</h3>
                    <span className="text-xs bg-[#e6eff8] text-[#003d7c] font-semibold px-2 py-0.5 rounded border border-[#c2c6d3]">
                      {batch.profile}
                    </span>
                  </div>
                  <div className="text-xs text-[#727783] mt-0.5">
                    {batch.vouchers.length} vouchers • Created: {batch.createdDate} • Time: {batch.timeLimit} • Limit: {batch.dataLimitMb} MB
                  </div>
                </div>

                <button
                  onClick={() => onOpenPrintModal(batch)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#e6eff8] hover:bg-[#dbe4ed] text-[#003d7c] rounded-lg text-xs font-semibold border border-[#c2c6d3] transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Batch Cards</span>
                </button>
              </div>

              {/* Vouchers Sample Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {batch.vouchers.slice(0, 8).map((v, i) => (
                  <div
                    key={i}
                    className="p-3 bg-[#f6faff] border border-[#c2c6d3] rounded-lg flex flex-col justify-between gap-2 text-xs relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#003d7c] tracking-wider">
                        {v.code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(v.code)}
                        className="text-[#727783] hover:text-[#003d7c] p-1"
                        title="Copy code"
                      >
                        {copiedCode === v.code ? (
                          <Check className="w-3.5 h-3.5 text-[#006e25]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex justify-between text-[11px] text-[#424751]">
                      <span>PIN: <strong className="font-mono">{v.pin}</strong></span>
                      <span>${v.price.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-[10px] text-[#727783] border-t border-[#dbe4ed] pt-1">
                      <span>{v.timeLimit}</span>
                      <span>{v.dataLimitFormatted}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Batch Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-[#c2c6d3] max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-[#141d23]">Generate Vouchers</h2>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#424751] block mb-1">
                  Batch Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.batchName}
                  onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#424751] block mb-1">
                    Quantity (Cards)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#424751] block mb-1">
                    Prefix
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#424751] block mb-1">
                    Time Limit
                  </label>
                  <select
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
                  >
                    <option value="1h">1 Hour</option>
                    <option value="3h">3 Hours</option>
                    <option value="12h">12 Hours</option>
                    <option value="24h">1 Day (24h)</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#424751] block mb-1">
                    Data Limit (MB)
                  </label>
                  <select
                    value={formData.dataLimitMb}
                    onChange={(e) => setFormData({ ...formData, dataLimitMb: e.target.value })}
                    className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
                  >
                    <option value="512">512 MB</option>
                    <option value="1024">1 GB (1024 MB)</option>
                    <option value="2048">2 GB</option>
                    <option value="5120">5 GB</option>
                    <option value="10240">10 GB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#424751] block mb-1">
                  Selling Price ($)
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dbe4ed]">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-[#c2c6d3] rounded-lg text-sm text-[#424751]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#003d7c] hover:bg-[#0054a6] text-white rounded-lg text-sm font-semibold"
                >
                  Generate Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
