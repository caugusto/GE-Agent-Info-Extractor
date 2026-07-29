import React from 'react';
import { Bot, Users, Globe, Lock, Cpu, Database, ChevronRight, ShieldCheck, Tag } from 'lucide-react';

export default function AgentCard({ agent, onSelect }) {
  const isShared = agent.is_shared;
  const isEnterprise = agent.is_available_to_everyone;
  const platform = agent.agent_platform || 'Registered Agent';
  const status = agent.agent_status || 'Published (Enabled)';

  // Platform Badge Color
  const getPlatformBadge = () => {
    if (platform.includes('Agent Designer')) {
      return 'bg-google-blue/15 text-google-blue border-google-blue/30';
    } else if (platform.includes('Agent Runtime') || platform.includes('Reasoning Engine')) {
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    } else if (platform.includes('Cloud Run')) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    } else if (platform.includes('GKE')) {
      return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  // Status Badge Color
  const getStatusBadge = () => {
    if (status.includes('Enabled')) {
      return 'bg-google-green/15 text-google-green border-google-green/30';
    } else if (status.includes('Private')) {
      return 'bg-google-blue/15 text-google-blue border-google-blue/30';
    } else if (status.includes('Draft')) {
      return 'bg-google-yellow/15 text-google-yellow border-google-yellow/30';
    }
    return 'bg-google-red/15 text-google-red border-google-red/30';
  };

  return (
    <div
      onClick={() => onSelect(agent)}
      className="glass-panel glass-panel-hover p-5 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between group relative border border-dark-border"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getPlatformBadge()}`}>
            {platform.replace('Employee-made: ', '')}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge()}`}>
            {status}
          </span>
        </div>

        {/* Agent Name */}
        <h4 className="text-lg font-bold text-white group-hover:text-google-blue transition-colors line-clamp-1">
          {agent.agent_name}
        </h4>

        {/* Instance / Project info */}
        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
          {agent.gemini_enterprise_instance_name && agent.gemini_enterprise_instance_name !== 'N/A'
            ? agent.gemini_enterprise_instance_name
            : agent.gcp_project_id}
        </p>

        {/* Description */}
        <p className="text-xs text-slate-400/80 mt-2.5 line-clamp-2 leading-relaxed">
          {agent.agent_description || 'No description available.'}
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-3 border-t border-dark-border/50 flex items-center justify-between text-xs text-slate-400">
        
        {/* Sharing Scope Icon */}
        <div className="flex items-center gap-1.5">
          {isEnterprise ? (
            <span className="inline-flex items-center gap-1 text-google-green font-medium">
              <Globe className="w-3.5 h-3.5" /> Enterprise Wide
            </span>
          ) : isShared ? (
            <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
              <Users className="w-3.5 h-3.5" /> Shared ({agent.shared_with_users ? agent.shared_with_users.length : 0})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
              <Lock className="w-3.5 h-3.5" /> Private
            </span>
          )}
        </div>

        {/* Capabilities icons */}
        <div className="flex items-center gap-2">
          {agent.uses_knowledge_sources && (
            <span title="Data Stores / RAG attached" className="p-1 rounded bg-google-green/10 text-google-green">
              <Database className="w-3.5 h-3.5" />
            </span>
          )}
          {agent.uses_mcp && (
            <span title="MCP Integration" className="p-1 rounded bg-google-red/10 text-google-red">
              <Cpu className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform group-hover:text-google-blue" />
        </div>
      </div>
    </div>
  );
}
