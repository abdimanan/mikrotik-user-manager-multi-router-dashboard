import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface FirewallGuideModalProps {
  onClose: () => void;
}

export const FirewallGuideModal: React.FC<FirewallGuideModalProps> = ({ onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyScript = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const script1 = `/certificate add name=api-ssl-ca common-name=api-ca days-valid=3650 key-usage=key-cert-sign,crl-sign
/certificate sign api-ssl-ca

/certificate add name=api-ssl-cert common-name=router-api days-valid=3650 key-usage=digital-signature,key-encipherment,tls-server
/certificate sign api-ssl-cert ca=api-ssl-ca

/ip service set api-ssl certificate=api-ssl-cert port=8729 disabled=no`;

  const script2 = `/ip firewall filter add chain=input protocol=tcp dst-port=8729 src-address-list=API_WHITELIST action=accept comment="Allow MikroTik Manager Dashboard API-SSL"
/ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address-list=API_WHITELIST action=accept comment="Allow MikroTik Manager Plain API"
/ip firewall address-list add list=API_WHITELIST address=YOUR_SERVER_PUBLIC_IP comment="Web Dashboard Server"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-[#c2c6d3] max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-[#dbe4ed] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#80f98b]/30 p-2 rounded-lg text-[#007327]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141d23]">
                MikroTik API-SSL & Firewall Setup Guide
              </h2>
              <p className="text-xs text-[#424751]">
                Official configuration for production multi-router fleets (1,000+ routers)
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

        <div className="space-y-4 text-xs text-[#424751] leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          {/* Step 1 */}
          <div className="space-y-2 bg-[#f6faff] p-4 rounded-lg border border-[#c2c6d3]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#003d7c] text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#003d7c] text-white flex items-center justify-center text-[11px]">
                  1
                </span>
                <span>Enable API-SSL (Port 8729) & Certificates in RouterOS</span>
              </h3>
              <button
                onClick={() => copyScript('s1', script1)}
                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#c2c6d3] rounded text-[11px] font-semibold text-[#003d7c] hover:bg-[#e6eff8]"
              >
                {copiedKey === 's1' ? <Check className="w-3.5 h-3.5 text-[#006e25]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 's1' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <p>
              Paste the following script into MikroTik Terminal or Winbox to generate self-signed certificates and enable TLS-encrypted API on port 8729:
            </p>
            <pre className="bg-[#141d23] text-[#afcbff] p-3 rounded font-mono text-[11px] whitespace-pre-wrap overflow-x-auto">
              {script1}
            </pre>
          </div>

          {/* Step 2 */}
          <div className="space-y-2 bg-[#f6faff] p-4 rounded-lg border border-[#c2c6d3]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#003d7c] text-sm flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#003d7c] text-white flex items-center justify-center text-[11px]">
                  2
                </span>
                <span>Firewall Whitelist Rules (Prevent WinError 10060 Timeout)</span>
              </h3>
              <button
                onClick={() => copyScript('s2', script2)}
                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#c2c6d3] rounded text-[11px] font-semibold text-[#003d7c] hover:bg-[#e6eff8]"
              >
                {copiedKey === 's2' ? <Check className="w-3.5 h-3.5 text-[#006e25]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 's2' ? 'Copied' : 'Copy Firewall Rule'}</span>
              </button>
            </div>
            <p>
              Restrict API access exclusively to this dashboard server IP to prevent brute-force attacks from the internet:
            </p>
            <pre className="bg-[#141d23] text-[#afcbff] p-3 rounded font-mono text-[11px] whitespace-pre-wrap overflow-x-auto">
              {script2}
            </pre>
          </div>

          {/* Step 3 */}
          <div className="space-y-1.5 p-3 rounded-lg border border-[#c2c6d3] bg-white">
            <h4 className="font-bold text-[#141d23] text-xs">
              3. Dedicated API User Manager Group (Least Privilege)
            </h4>
            <p className="text-[11px] text-[#727783]">
              Instead of using the default <code className="font-mono bg-[#f6faff] px-1 py-0.5 border rounded">admin</code> user, create a dedicated group in <code className="font-mono">/user group add name=dashboard-api policy=api,read,write,test</code> with a restricted username and strong password.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#dbe4ed]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#003d7c] hover:bg-[#0054a6] text-white rounded-lg text-xs font-semibold"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
