import React, { useState, useEffect } from 'react';
import { RouterRecord, ConnectionTestResult, ConnectionType } from '../types';
import { ShieldCheck, Server, AlertCircle, CheckCircle2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { api } from '../api';

interface AddRouterModalProps {
  routerToEdit?: RouterRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export const AddRouterModal: React.FC<AddRouterModalProps> = ({
  routerToEdit,
  onClose,
  onSaved
}) => {
  const [name, setName] = useState(routerToEdit?.name || '');
  const [publicIp, setPublicIp] = useState(routerToEdit?.publicIp || '');
  const [connectionType, setConnectionType] = useState<ConnectionType>(
    routerToEdit?.connectionType || 'api-ssl'
  );
  const [apiPort, setApiPort] = useState<number>(
    routerToEdit?.apiPort || (routerToEdit?.connectionType === 'api' ? 8728 : 8729)
  );
  const [username, setUsername] = useState(routerToEdit?.username || 'admin');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState(routerToEdit?.location || '');
  const [showPassword, setShowPassword] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Automatically adjust default port when connection type toggles
  const handleConnectionTypeChange = (type: ConnectionType) => {
    setConnectionType(type);
    if (type === 'api-ssl' && apiPort === 8728) {
      setApiPort(8729);
    } else if (type === 'api' && apiPort === 8729) {
      setApiPort(8728);
    }
  };

  const handleTestConnection = async () => {
    if (!publicIp || !username) {
      setErrorMsg('Please enter both Public IP and Username to test connection.');
      return;
    }

    setErrorMsg(null);
    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.testConnection({
        publicIp,
        apiPort: Number(apiPort),
        connectionType,
        username,
        password: password || undefined
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        message: 'Connection failed',
        details: err.message || 'Unknown network error'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (routerToEdit) {
        await api.updateRouter(routerToEdit.id, {
          name,
          publicIp,
          apiPort: Number(apiPort),
          connectionType,
          username,
          password: password || undefined,
          location
        });
      } else {
        await api.addRouter({
          name,
          publicIp,
          apiPort: Number(apiPort),
          connectionType,
          username,
          password: password || 'admin',
          location
        });
      }
      onSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save router');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-[#c2c6d3] max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-[#dbe4ed] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#e6eff8] p-2 rounded-lg text-[#003d7c]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141d23]">
                {routerToEdit ? 'Edit MikroTik Router' : 'Add New MikroTik Router'}
              </h2>
              <p className="text-xs text-[#424751]">
                Connect to RouterOS API with encrypted credentials
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

        {errorMsg && (
          <div className="p-3 bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#ba1a1a] rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Router Friendly Name */}
          <div>
            <label className="text-xs font-bold text-[#424751] block mb-1">
              Router Friendly Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Branch-001 or HQ-Core-01"
              className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c] focus:ring-1 focus:ring-[#003d7c]"
            />
          </div>

          {/* Public IP and Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#424751] block mb-1">
                Public IP / Hostname *
              </label>
              <input
                type="text"
                required
                value={publicIp}
                onChange={(e) => setPublicIp(e.target.value.trim())}
                placeholder="143.105.216.10"
                className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm font-mono focus:outline-none focus:border-[#003d7c] focus:ring-1 focus:ring-[#003d7c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#424751] block mb-1">
                Site Location / Region
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New York, Floor 2"
                className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c] focus:ring-1 focus:ring-[#003d7c]"
              />
            </div>
          </div>

          {/* Connection Protocol & Port */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#f6faff] p-3.5 rounded-lg border border-[#c2c6d3]">
            <div>
              <label className="text-xs font-bold text-[#003d7c] block mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Connection Protocol</span>
              </label>
              <select
                value={connectionType}
                onChange={(e) => handleConnectionTypeChange(e.target.value as ConnectionType)}
                className="w-full px-3 py-1.5 border border-[#c2c6d3] rounded-lg text-xs font-semibold text-[#003d7c] bg-white focus:outline-none focus:border-[#003d7c]"
              >
                <option value="api-ssl">API-SSL (Encrypted Port 8729) - Recommended</option>
                <option value="api">API Plaintext (Port 8728)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#424751] block mb-1">
                API Port
              </label>
              <input
                type="number"
                required
                value={apiPort}
                onChange={(e) => setApiPort(parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 border border-[#c2c6d3] rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-[#003d7c]"
              />
            </div>
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#424751] block mb-1">
                API Username *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#424751] block mb-1">
                API Password {routerToEdit && '(Leave blank to keep)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={routerToEdit ? '••••••••' : 'Password'}
                  className="w-full pl-3 pr-8 py-2 border border-[#c2c6d3] rounded-lg text-sm focus:outline-none focus:border-[#003d7c]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#727783] hover:text-[#141d23]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Test Connection Button & Result Box */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full py-2 px-3 bg-[#e6eff8] hover:bg-[#dbe4ed] text-[#003d7c] border border-[#c2c6d3] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing Socket & Handshake...' : 'Test Connection'}</span>
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  testResult.success
                    ? 'bg-[#80f98b]/20 border-[#006e25] text-[#006e25]'
                    : 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{testResult.message}</span>
                  {testResult.latencyMs > 0 && (
                    <span className="font-mono font-normal">({testResult.latencyMs}ms)</span>
                  )}
                </div>
                {testResult.version && (
                  <div className="text-[11px]">
                    RouterOS {testResult.version} • {testResult.architecture || 'ARM64'} • CPU Count: {testResult.cpuCount || 4}
                  </div>
                )}
                {testResult.details && (
                  <div className="text-[11px] font-mono opacity-90">
                    {testResult.details}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#dbe4ed]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#c2c6d3] rounded-lg text-sm text-[#424751] hover:bg-[#e6eff8] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#003d7c] hover:bg-[#0054a6] text-white rounded-lg text-sm font-semibold shadow-xs disabled:opacity-60"
            >
              {submitting ? 'Saving...' : routerToEdit ? 'Save Changes' : 'Add Router'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
