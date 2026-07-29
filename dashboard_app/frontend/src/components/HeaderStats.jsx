import React from 'react';
import { Bot, ShieldCheck, Cpu, Database, Users, Sparkles, Layers } from 'lucide-react';

export default function HeaderStats({ stats }) {
  if (!stats || Object.keys(stats).length === 0) return null;

  const total = stats.total_agents || 0;
  const shared = stats.total_shared || 0;
  const enterprise = stats.total_enterprise_wide || 0;
  const restricted = stats.total_restricted_shared || 0;
  const privateCount = stats.total_private || 0;

  const rag = stats.uses_rag_count || 0;
  const mcp = stats.uses_mcp_count || 0;
  const tools = stats.uses_tools_count || 0;
  const code = stats.uses_code_count || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Agents Card */}
      <div className="glass-panel p-5 rounded-2xl border-t-2 border-t-google-blue relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Agents</p>
            <h3 className="text-3xl font-bold text-white mt-1">{total}</h3>
          </div>
          <div className="p-3 bg-google-blue/10 text-google-blue rounded-xl group-hover:scale-110 transition-transform">
            <Bot className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-google-blue/20 text-google-blue font-semibold">
            {stats.count_agent_designer || 0} No-Code
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-semibold">
            {stats.count_agent_runtime || 0} ADK Code
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
            {stats.count_cloud_run || 0} Cloud Run
          </span>
        </div>
      </div>

      {/* Sharing Scope Card */}
      <div className="glass-panel p-5 rounded-2xl border-t-2 border-t-google-green relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sharing Exposure</p>
            <h3 className="text-3xl font-bold text-white mt-1">
              {total > 0 ? Math.round((shared / total) * 100) : 0}%
            </h3>
          </div>
          <div className="p-3 bg-google-green/10 text-google-green rounded-xl group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-google-green/20 text-google-green font-semibold">
            {enterprise} Enterprise
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
            {restricted} Restricted
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
            {privateCount} Private
          </span>
        </div>
      </div>

      {/* RAG & Knowledge Sources Card */}
      <div className="glass-panel p-5 rounded-2xl border-t-2 border-t-google-yellow relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">RAG / Data Stores</p>
            <h3 className="text-3xl font-bold text-white mt-1">
              {total > 0 ? Math.round((rag / total) * 100) : 0}%
            </h3>
          </div>
          <div className="p-3 bg-google-yellow/10 text-google-yellow rounded-xl group-hover:scale-110 transition-transform">
            <Database className="w-6 h-6" />
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          <strong className="text-google-yellow">{rag}</strong> agents connect to Drive, Gmail, BQ or Data Stores
        </p>
      </div>

      {/* Code & Tooling Capabilities Card */}
      <div className="glass-panel p-5 rounded-2xl border-t-2 border-t-google-red relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">MCP & Tools</p>
            <h3 className="text-3xl font-bold text-white mt-1">{tools}</h3>
          </div>
          <div className="p-3 bg-google-red/10 text-google-red rounded-xl group-hover:scale-110 transition-transform">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-google-red/20 text-google-red font-semibold">
            {mcp} MCP Servers
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-semibold">
            {code} Python Sandbox
          </span>
        </div>
      </div>
    </div>
  );
}
