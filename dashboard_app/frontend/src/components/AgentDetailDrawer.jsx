import React from 'react';
import { X, ShieldCheck, Users, Globe, Lock, Cpu, Database, Server, Code, FileText, Link as LinkIcon, Key, Terminal } from 'lucide-react';

export default function AgentDetailDrawer({ agent, onClose }) {
  if (!agent) return null;

  const isShared = agent.is_shared;
  const isEnterprise = agent.is_available_to_everyone;
  const platform = agent.agent_platform || 'Registered Agent';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-2xl bg-dark-bg border-l border-dark-border h-full overflow-y-auto p-6 md:p-8 flex flex-col justify-between shadow-2xl relative">
        
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-6 border-b border-dark-border">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-google-blue/15 text-google-blue border border-google-blue/30">
                  {platform}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-google-green/15 text-google-green border border-google-green/30">
                  {agent.agent_status || 'Published'}
                </span>
                {agent.agent_environment && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {agent.agent_environment}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white">{agent.agent_name}</h2>
              <p className="text-xs text-slate-400 font-mono mt-1 select-all break-all">{agent.agent_id}</p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-dark-card hover:bg-dark-hover rounded-xl border border-dark-border transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="py-6 space-y-6">

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
              <p className="text-sm text-slate-200 leading-relaxed bg-dark-card p-4 rounded-xl border border-dark-border">
                {agent.agent_description || 'No description provided.'}
              </p>
            </div>

            {/* Instance & Ownership Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-dark-card p-4 rounded-xl border border-dark-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gemini Enterprise Instance</span>
                <span className="text-sm font-semibold text-white mt-1 block">
                  {agent.gemini_enterprise_instance_name || 'N/A'}
                </span>
              </div>

              <div className="bg-dark-card p-4 rounded-xl border border-dark-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GCP Project ID</span>
                <span className="text-sm font-semibold text-white mt-1 block">{agent.gcp_project_id || 'N/A'}</span>
              </div>

              <div className="bg-dark-card p-4 rounded-xl border border-dark-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Author / Owner Email</span>
                <span className="text-sm font-semibold text-google-blue mt-1 block break-all">{agent.author_email || 'N/A'}</span>
              </div>

              <div className="bg-dark-card p-4 rounded-xl border border-dark-border">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SPIFFE Identity URI</span>
                <span className="text-xs font-mono text-slate-300 mt-1 block break-all select-all">{agent.spiffe_id || 'N/A'}</span>
              </div>
            </div>

            {/* Permissions & Sharing Policy Section */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Permissions & Sharing Access</span>
                <span className="text-google-green text-[11px] font-semibold">Scope: {agent.access_scope || 'Private'}</span>
              </h4>

              <div className="bg-dark-card p-4 rounded-xl border border-dark-border space-y-3">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-dark-border">
                  <span className="text-slate-400">Enterprise Wide Access (`is_available_to_everyone`):</span>
                  <span className={`font-semibold ${isEnterprise ? 'text-google-green' : 'text-slate-400'}`}>
                    {isEnterprise ? 'TRUE (Shared with All Users)' : 'FALSE'}
                  </span>
                </div>

                {agent.shared_with_users && agent.shared_with_users.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5 font-medium">Shared Users List:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.shared_with_users.map((usr, i) => (
                        <span key={i} className="px-2.5 py-1 bg-google-blue/10 text-google-blue text-xs font-medium rounded-lg border border-google-blue/20">
                          {usr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {agent.permission_roles && agent.permission_roles.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5 font-medium">Detailed Permission Roles:</span>
                    <ul className="space-y-1 text-xs">
                      {agent.permission_roles.map((role, idx) => (
                        <li key={idx} className="text-slate-300 bg-dark-hover px-3 py-1.5 rounded-lg border border-dark-border/50 font-mono">
                          {role}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt & System Instructions */}
            {agent.system_instructions && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">System Instructions / Prompt</h4>
                <div className="bg-black/90 p-4 rounded-xl border border-dark-border font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {agent.system_instructions}
                </div>
              </div>
            )}

            {/* Reasoning Engine Execution Specs (If Reasoning Engine) */}
            {agent.reasoning_engine_id && (
              <div>
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Vertex AI Reasoning Engine Execution Specs</h4>
                <div className="bg-dark-card p-4 rounded-xl border border-purple-500/30 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Python Version:</span> <strong className="text-white">{agent.python_version || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Framework:</span> <strong className="text-white">{agent.agent_framework || 'google-adk'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Runtime Service Account:</span> <code className="text-purple-300 font-mono block break-all">{agent.reasoning_engine_service_account}</code>
                  </div>
                  {agent.pickle_object_gcs_uri && (
                    <div>
                      <span className="text-slate-400">Pickle Object GCS URI:</span> <code className="text-purple-300 font-mono block break-all">{agent.pickle_object_gcs_uri}</code>
                    </div>
                  )}
                  {agent.requirements_gcs_uri && (
                    <div>
                      <span className="text-slate-400">Requirements GCS URI:</span> <code className="text-purple-300 font-mono block break-all">{agent.requirements_gcs_uri}</code>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cloud Run / A2A Execution Specs (If Cloud Run / A2A) */}
            {agent.cloud_run_service_name && (
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Cloud Run Container & A2A Specs</h4>
                <div className="bg-dark-card p-4 rounded-xl border border-amber-500/30 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Service Name & Region:</span> <strong className="text-white">{agent.cloud_run_service_name} ({agent.cloud_run_region})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Container Image:</span> <code className="text-amber-300 font-mono block break-all">{agent.cloud_run_image}</code>
                  </div>
                  {agent.a2a_agent_url && (
                    <div>
                      <span className="text-slate-400">A2A Endpoint URL:</span> <a href={agent.a2a_agent_url} target="_blank" rel="noreferrer" className="text-google-blue underline font-mono block break-all">{agent.a2a_agent_url}</a>
                    </div>
                  )}
                  {agent.a2a_skills && agent.a2a_skills.length > 0 && (
                    <div>
                      <span className="text-slate-400 block mb-1">A2A Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {agent.a2a_skills.map((sk, i) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded border border-amber-500/20 text-[11px]">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-dark-border text-center text-xs text-slate-500">
          Agent Inventory Dashboard • Powered by BigQuery & Cloud Run IAP
        </div>

      </div>
    </div>
  );
}
