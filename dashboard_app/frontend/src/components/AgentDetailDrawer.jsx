import React from 'react';
import { X, Globe, Lock, Users, Cpu, Database, Server, Code, FileText, Link as LinkIcon, Key, Terminal } from 'lucide-react';

export default function AgentDetailDrawer({ agent, onClose }) {
  if (!agent) return null;

  const isShared = agent.is_shared;
  const isEnterprise = agent.is_available_to_everyone;
  const platform = agent.agent_platform || 'Registered Agent';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs animate-fade-in flex justify-end">
      <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full overflow-y-auto p-6 md:p-10 flex flex-col justify-between shadow-2xl relative">
        
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-google-blue border border-blue-200">
                  {platform}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-google-green border border-green-200">
                  {agent.agent_status || 'Published'}
                </span>
                {agent.agent_environment && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {agent.agent_environment}
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{agent.agent_name}</h2>
              <p className="text-xs text-slate-500 font-mono mt-1.5 select-all break-all">{agent.agent_id}</p>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body Content */}
          <div className="py-6 space-y-6">

            {/* Description */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
              <p className="text-sm md:text-base text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                {agent.agent_description || 'No description provided.'}
              </p>
            </div>

            {/* Instance & Ownership Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Gemini Enterprise Instance</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  {agent.gemini_enterprise_instance_name || 'N/A'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">GCP Project ID</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">{agent.gcp_project_id || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Author / Owner Email</span>
                <span className="text-sm font-bold text-google-blue mt-1 block break-all">{agent.author_email || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">SPIFFE Identity URI</span>
                <span className="text-xs font-mono font-medium text-slate-700 mt-1 block break-all select-all">{agent.spiffe_id || 'N/A'}</span>
              </div>
            </div>

            {/* Permissions & Sharing Policy Section */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Permissions & Sharing Access</span>
                <span className="text-google-green text-xs font-extrabold">Scope: {agent.access_scope || 'Private'}</span>
              </h4>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-sm pb-3 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Enterprise Wide Access (`is_available_to_everyone`):</span>
                  <span className={`font-bold ${isEnterprise ? 'text-google-green' : 'text-slate-500'}`}>
                    {isEnterprise ? 'TRUE (Shared with All Users)' : 'FALSE'}
                  </span>
                </div>

                {agent.shared_with_users && agent.shared_with_users.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500 block mb-2 font-bold uppercase tracking-wider">Shared Users List:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.shared_with_users.map((usr, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 text-google-blue text-xs font-bold rounded-lg border border-blue-200">
                          {usr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {agent.permission_roles && agent.permission_roles.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500 block mb-2 font-bold uppercase tracking-wider">Detailed Permission Roles:</span>
                    <ul className="space-y-1.5 text-xs">
                      {agent.permission_roles.map((role, idx) => (
                        <li key={idx} className="text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono">
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
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">System Instructions / Prompt</h4>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-100 max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {agent.system_instructions}
                </div>
              </div>
            )}

            {/* Reasoning Engine Execution Specs */}
            {agent.reasoning_engine_id && (
              <div>
                <h4 className="text-xs font-extrabold text-purple-700 uppercase tracking-wider mb-2">Vertex AI Reasoning Engine Execution Specs</h4>
                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200 space-y-2 text-xs md:text-sm">
                  <div>
                    <span className="text-slate-600 font-medium">Python Version:</span> <strong className="text-slate-900">{agent.python_version || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium">Framework:</span> <strong className="text-slate-900">{agent.agent_framework || 'google-adk'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium">Runtime Service Account:</span> <code className="text-purple-800 font-mono block break-all font-semibold">{agent.reasoning_engine_service_account}</code>
                  </div>
                  {agent.pickle_object_gcs_uri && (
                    <div>
                      <span className="text-slate-600 font-medium">Pickle Object GCS URI:</span> <code className="text-purple-800 font-mono block break-all font-semibold">{agent.pickle_object_gcs_uri}</code>
                    </div>
                  )}
                  {agent.requirements_gcs_uri && (
                    <div>
                      <span className="text-slate-600 font-medium">Requirements GCS URI:</span> <code className="text-purple-800 font-mono block break-all font-semibold">{agent.requirements_gcs_uri}</code>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cloud Run / A2A Execution Specs */}
            {agent.cloud_run_service_name && (
              <div>
                <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-wider mb-2">Cloud Run Container & A2A Specs</h4>
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-2 text-xs md:text-sm">
                  <div>
                    <span className="text-slate-600 font-medium">Service Name & Region:</span> <strong className="text-slate-900">{agent.cloud_run_service_name} ({agent.cloud_run_region})</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium">Container Image:</span> <code className="text-amber-900 font-mono block break-all font-semibold">{agent.cloud_run_image}</code>
                  </div>
                  {agent.a2a_agent_url && (
                    <div>
                      <span className="text-slate-600 font-medium">A2A Endpoint URL:</span> <a href={agent.a2a_agent_url} target="_blank" rel="noreferrer" className="text-google-blue underline font-mono block break-all font-bold">{agent.a2a_agent_url}</a>
                    </div>
                  )}
                  {agent.a2a_skills && agent.a2a_skills.length > 0 && (
                    <div>
                      <span className="text-slate-600 block mb-1 font-bold">A2A Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {agent.a2a_skills.map((sk, i) => (
                          <span key={i} className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-200 text-xs">
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
        <div className="pt-4 border-t border-slate-200 text-center text-xs font-semibold text-slate-500">
          Agent Inventory Dashboard • Powered by BigQuery & Cloud Run IAP
        </div>

      </div>
    </div>
  );
}
