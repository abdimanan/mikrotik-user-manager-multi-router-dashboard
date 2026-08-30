import React, { useState } from 'react';
import { RouterRecord } from '../types';
import { Terminal, Send, Play, CornerDownLeft, Trash2 } from 'lucide-react';

interface TerminalModalProps {
  router: RouterRecord;
  onClose: () => void;
}

export const TerminalModal: React.FC<TerminalModalProps> = ({ router, onClose }) => {
  const [command, setCommand] = useState('/system/resource/print');
  const [logs, setLogs] = useState<Array<{ cmd: string; output: string; time: string }>>([
    {
      cmd: '/system/resource/print',
      output: `!re\n=uptime=45d12h30m\n=version=7.12.1 (stable)\n=free-memory=641728512\n=total-memory=1073741824\n=cpu=ARM64\n=cpu-count=4\n=cpu-frequency=1400\n=cpu-load=15\n=free-hdd-space=125829120\n=total-hdd-space=134217728\n=architecture-name=arm64\n=board-name=RB5009UG+S+IN\n!done`,
      time: new Date().toLocaleTimeString()
    }
  ]);
  const [executing, setExecuting] = useState(false);

  const quickCommands = [
    '/system/resource/print',
    '/system/identity/print',
    '/user-manager/user/print',
    '/user-manager/session/print',
    '/ip/address/print',
    '/interface/print'
  ];

  const handleExecute = (cmdToRun?: string) => {
    const cmd = cmdToRun || command;
    if (!cmd.trim()) return;

    setExecuting(true);
    setTimeout(() => {
      let output = '';
      if (cmd.includes('identity')) {
        output = `!re\n=name=${router.name}\n!done`;
      } else if (cmd.includes('user/print')) {
        output = `!re\n=.id=*1\n=name=user001\n=profile=VIP-50Mbps\n=disabled=false\n!re\n=.id=*2\n=name=guest_99\n=profile=Guest-1Hour\n=disabled=false\n!done`;
      } else if (cmd.includes('session/print')) {
        output = `!re\n=.id=*10\n=user=user001\n=ip-address=192.168.88.140\n=uptime=02:14:00\n=download=45201948\n=upload=12891024\n!done`;
      } else if (cmd.includes('address')) {
        output = `!re\n=.id=*1\n=address=${router.publicIp}/24\n=network=143.105.216.0\n=interface=ether1\n!re\n=.id=*2\n=address=192.168.88.1/24\n=network=192.168.88.0\n=interface=bridge1\n!done`;
      } else if (cmd.includes('interface')) {
        output = `!re\n=.id=*1\n=name=ether1\n=type=ether\n=running=true\n!re\n=.id=*2\n=name=bridge1\n=type=bridge\n=running=true\n!done`;
      } else {
        output = `!re\n=status=ok\n=router=${router.name}\n=ip=${router.publicIp}\n=response=acknowledged\n!done`;
      }

      setLogs((prev) => [
        ...prev,
        {
          cmd,
          output,
          time: new Date().toLocaleTimeString()
        }
      ]);
      setExecuting(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#141d23] text-[#e6eff8] rounded-xl border border-[#424751] max-w-3xl w-full p-5 shadow-2xl space-y-4 font-mono text-xs flex flex-col h-[600px] max-h-[90vh]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#424751] pb-3 font-sans">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#80f98b]" />
            <div>
              <h2 className="text-sm font-bold text-white">
                RouterOS Binary API Console — {router.name}
              </h2>
              <p className="text-[11px] text-[#afcbff]">
                Connected to {router.publicIp}:{router.apiPort} via {router.connectionType.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogs([])}
              className="text-[#afcbff] hover:text-white p-1"
              title="Clear terminal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-[#afcbff] hover:text-white p-1 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quick command buttons */}
        <div className="flex flex-wrap gap-1.5 font-sans">
          {quickCommands.map((q) => (
            <button
              key={q}
              onClick={() => {
                setCommand(q);
                handleExecute(q);
              }}
              className="px-2 py-1 bg-[#1e2a33] hover:bg-[#2c3d4b] text-[#afcbff] hover:text-white rounded text-[11px] font-mono transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Terminal Output Area */}
        <div className="flex-1 overflow-y-auto bg-[#0a0f12] rounded-lg p-3 space-y-3 border border-[#2c3d4b]">
          <div className="text-[#727783] text-[11px]">
            [MikroTik RouterOS API Binary Length-Prefixed Protocol v7/v6 Ready]
          </div>

          {logs.map((log, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2 text-[#80f98b]">
                <span>&gt;&gt;&gt;</span>
                <span className="font-bold">{log.cmd}</span>
                <span className="text-[10px] text-[#727783] ml-auto">{log.time}</span>
              </div>
              <pre className="text-[#afcbff] bg-[#141d23]/80 p-2 rounded whitespace-pre-wrap leading-relaxed border-l-2 border-[#0054a6]">
                {log.output}
              </pre>
            </div>
          ))}

          {executing && (
            <div className="text-[#80f98b] animate-pulse">
              Sending sentence & awaiting !done reply...
            </div>
          )}
        </div>

        {/* Terminal Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecute();
          }}
          className="flex gap-2 font-mono"
        >
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#80f98b]">
              &gt;
            </span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="/system/resource/print"
              className="w-full pl-7 pr-3 py-2 bg-[#0a0f12] border border-[#424751] rounded text-[#e6eff8] text-xs focus:outline-none focus:border-[#80f98b]"
            />
          </div>
          <button
            type="submit"
            disabled={executing}
            className="px-4 py-2 bg-[#0054a6] hover:bg-[#003d7c] text-white rounded font-sans font-semibold text-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
