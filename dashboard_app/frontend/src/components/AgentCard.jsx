import React from 'react';
import { Bot, Users, Globe, Lock, Cpu, Database, ChevronRight } from 'lucide-react';

export default function AgentCard({ agent, onSelect }) {
  const isShared = agent.is_shared;
  const isEnterprise = agent.is_available_to_everyone;
  const platform = agent.agent_platform || 'Registered Agent';
  const status = agent.agent_status || 'Published (Enabled)';

  // Platform Badge Color
  const getPlatformBadge = () => {
    if (platform.includes('Agent Designer')) {
      return 'bg-blue-100 text-google-blue border-blue-200';
    } else if (platform.includes('Agent Runtime') || platform.includes('Reasoning Engine')) {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    } else if (platform.includes('Cloud Run')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    } else if (platform.includes('GKE')) {
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Status Badge Color
  const getStatusBadge = () => {
    if (status.includes('Enabled')) {
      return 'bg-green-100 text-google-green border-green-200';
    } else if (status.includes('Private')) {
      return 'bg-blue-100 text-google-blue border-blue-200';
    } else if (status.includes('Draft')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-red-100 text-google-red border-red-200';
  };

  return (
    <div
      onClick={() => onSelect(agent)}
      className="glass-panel glass-panel-hover p-6 md:p-7 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between group relative border border-slate-200 bg-white shadow-sm hover:shadow-md"
    >
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPlatformBadge()}`}>
            {platform.replace('Employee-made: ', '')}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge()}`}>
            {status}
          </span>
        </div>

        {/* Agent Name */}
        <h4 className="text-xl font-black text-slate-900 group-hover:text-google-blue transition-colors line-clamp-1 tracking-tight">
          {agent.agent_name}
        </h4>

        {/* Instance / Project info */}
        <p className="text-xs md:text-sm font-semibold text-slate-500 mt-1 line-clamp-1">
          {agent.gemini_enterprise_instance_name && agent.gemini_enterprise_instance_name !== 'N/A'
            ? agent.gemini_enterprise_instance_name
            : agent.gcp_project_id}
        </p>

        {/* Description */}
        <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">
          {agent.agent_description || 'No description available.'}
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs md:text-sm text-slate-600">
        
        {/* Sharing Scope Icon */}
        <div className="flex items-center gap-1.5 font-bold">
          {isEnterprise ? (
            <span className="inline-flex items-center gap-1.5 text-google-green">
              <Globe className="w-4 h-4" /> Enterprise Wide
            </span>
          ) : isShared ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <Users className="w-4 h-4" /> Shared ({agent.shared_with_users ? agent.shared_with_users.length : 0})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Lock className="w-4 h-4" /> Private
            </span>
          )}
        </div>

        {/* Capabilities icons & Arrow */}
        <div className="flex items-center gap-2">
          {agent.uses_knowledge_sources && (
            <span title="Data Stores / RAG attached" className="p-1.5 rounded-lg bg-green-50 text-google-green font-bold">
              <Database className="w-4 h-4" />
            </span>
          )}
          {agent.uses_mcp && (
            <span title="MCP Integration" className="p-1.5 rounded-lg bg-red-50 text-google-red font-bold">
              <Cpu className="w-4 h-4" />
            </span>
          )}
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform group-hover:text-google-blue" />
        </div>
      </div>
    </div>
  );
}
