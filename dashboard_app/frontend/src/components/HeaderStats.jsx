import React from 'react';
import { Bot, Users, Building2, Server, HelpCircle } from 'lucide-react';

export default function HeaderStats({ stats, filters, setFilters }) {
  if (!stats || Object.keys(stats).length === 0) return null;

  const total = stats.total_agents || 0;
  const shared = stats.total_shared || 0;
  const enterprise = stats.total_enterprise_wide || 0;
  const restricted = stats.total_restricted_shared || 0;
  const privateCount = stats.total_private || 0;

  const instanceCount = stats.distinct_instances_count || (stats.instances_breakdown ? stats.instances_breakdown.length : 0);
  const platformCount = stats.distinct_platforms_count || (stats.platforms_breakdown ? stats.platforms_breakdown.length : 0);

  const instancesBreakdown = stats.instances_breakdown || [];
  const platformsBreakdown = stats.platforms_breakdown || [];

  // Helper to update filters
  const applyFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? '' : value
    }));
  };

  // Format Standalone vs Instance Name
  const formatInstanceName = (name) => {
    if (!name) return 'Unknown';
    if (name.includes('N/A (Standalone') || name.startsWith('N/A')) {
      if (name.includes('Cloud Run')) return 'Cloud Run (Standalone)';
      if (name.includes('Agent Engine') || name.includes('Reasoning Engine')) return 'Agent Engine (Standalone)';
      return 'Standalone';
    }
    return name.replace('Gemini Enterprise: ', '');
  };

  // Format Platform display name
  const formatPlatformName = (name) => {
    if (!name) return 'Unknown';
    if (name.includes('Agent Designer')) return 'No-Code';
    if (name.includes('Workflow Agent')) return 'Workflow';
    if (name === 'Agent Runtime') return 'ADK Code';
    if (name === 'Cloud Run (A2A)') return 'Cloud Run';
    return name;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      
      {/* 1. Total Agents Card */}
      <div 
        className="glass-panel glass-panel-hover p-6 md:p-7 rounded-2xl border-t-4 border-t-google-blue bg-white flex flex-col justify-between shadow-sm hover:shadow-md"
        title="Total count of all AI Agents, Reasoning Engines, and Cloud Run services discovered across the organization"
      >
        <div 
          onClick={() => setFilters(prev => ({ ...prev, platform: '', instance_name: '' }))}
          className="cursor-pointer group flex items-start justify-between"
          title="Click to reset platform/instance filters and show all agents"
        >
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Total Agents
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </p>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 mt-2 tracking-tight group-hover:text-google-blue transition-colors">
              {total}
            </h3>
          </div>
          <div className="p-3.5 bg-blue-50 text-google-blue rounded-2xl group-hover:scale-110 transition-transform shadow-xs">
            <Bot className="w-8 h-8" />
          </div>
        </div>

        {/* Interactive Clickable Platform Pills with Hover Tooltips */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyFilter('platform', 'Employee-made: Agent Designer (Gemini Enterprise)')}
            title="No-Code: Agents created directly in Gemini Enterprise Agent Designer UI"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              filters.platform === 'Employee-made: Agent Designer (Gemini Enterprise)'
                ? 'bg-google-blue text-white border-google-blue shadow-xs'
                : 'bg-blue-50/80 text-google-blue border-blue-200 hover:bg-blue-100'
            }`}
          >
            {stats.count_agent_designer || 0} No-Code
          </button>

          <button
            type="button"
            onClick={() => applyFilter('platform', 'Agent Runtime')}
            title="ADK Code: Code-first Agents built with Google Agent Development Kit (ADK) deployed to Vertex AI Agent Runtime or Reasoning Engines"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              filters.platform === 'Agent Runtime'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
            }`}
          >
            {stats.count_agent_runtime || 0} ADK Code
          </button>

          <button
            type="button"
            onClick={() => applyFilter('platform', 'Cloud Run (A2A)')}
            title="Cloud Run: Containerized AI Agents or Agent-to-Agent (A2A) microservices deployed on Cloud Run"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              filters.platform === 'Cloud Run (A2A)'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {stats.count_cloud_run || 0} Cloud Run
          </button>
        </div>
      </div>

      {/* 2. Sharing Exposure Card */}
      <div 
        className="glass-panel glass-panel-hover p-6 md:p-7 rounded-2xl border-t-4 border-t-google-green bg-white flex flex-col justify-between shadow-sm hover:shadow-md"
        title="Sharing Exposure: Percentage of total agents that are shared with other users or published enterprise-wide"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Sharing Exposure
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </p>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 mt-2 tracking-tight">
              {total > 0 ? Math.round((shared / total) * 100) : 0}%
            </h3>
          </div>
          <div className="p-3.5 bg-green-50 text-google-green rounded-2xl shadow-xs">
            <Users className="w-8 h-8" />
          </div>
        </div>

        {/* Interactive Clickable Sharing Pills with Hover Tooltips */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyFilter('is_available_to_everyone', true)}
            title="Enterprise: Agent is published enterprise-wide and accessible to all users in the organization (is_available_to_everyone = TRUE)"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              filters.is_available_to_everyone === true
                ? 'bg-google-green text-white border-google-green shadow-xs'
                : 'bg-green-50 text-google-green border-green-200 hover:bg-green-100'
            }`}
          >
            {enterprise} Enterprise
          </button>

          <button
            type="button"
            onClick={() => {
              setFilters(prev => ({
                ...prev,
                is_shared: prev.is_shared === true && prev.is_available_to_everyone === false ? '' : true,
                is_available_to_everyone: false
              }));
            }}
            title="Restricted: Agent is explicitly shared with a subset of specific users or groups (is_shared = TRUE, is_available_to_everyone = FALSE)"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              filters.is_shared === true && filters.is_available_to_everyone === false
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {restricted} Restricted
          </button>

          <button
            type="button"
            onClick={() => applyFilter('is_shared', false)}
            title="Private: Agent is private to the author/owner and not shared with anyone (is_shared = FALSE)"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              filters.is_shared === false
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {privateCount} Private
          </button>
        </div>
      </div>

      {/* 3. Gemini Instances Card (based on gemini_enterprise_instance_name) */}
      <div 
        className="glass-panel glass-panel-hover p-6 md:p-7 rounded-2xl border-t-4 border-t-purple-600 bg-white flex flex-col justify-between shadow-sm hover:shadow-md"
        title="Gemini Enterprise Instances: Total distinct Gemini Enterprise instances and standalone environments hosting agents"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Gemini Instances
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </p>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 mt-2 tracking-tight">
              {instanceCount}
            </h3>
          </div>
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl shadow-xs">
            <Building2 className="w-8 h-8" />
          </div>
        </div>

        {/* Interactive Clickable Instance Pills with Hover Tooltips */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {instancesBreakdown.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyFilter('instance_name', item.name)}
              title={`Click to filter by instance: ${item.name} (${item.count} agents)`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                filters.instance_name === item.name
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
            >
              {item.count} {formatInstanceName(item.name)}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Agent Platforms Card (based on agent_platform) */}
      <div 
        className="glass-panel glass-panel-hover p-6 md:p-7 rounded-2xl border-t-4 border-t-google-red bg-white flex flex-col justify-between shadow-sm hover:shadow-md"
        title="Agent Platforms: Categorization of agents by platform architecture (Agent Designer, Agent Runtime, Cloud Run, Dialogflow, etc.)"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Agent Platforms
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </p>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 mt-2 tracking-tight">
              {platformCount}
            </h3>
          </div>
          <div className="p-3.5 bg-red-50 text-google-red rounded-2xl shadow-xs">
            <Server className="w-8 h-8" />
          </div>
        </div>

        {/* Interactive Clickable Platform Pills with Hover Tooltips */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {platformsBreakdown.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyFilter('platform', item.name)}
              title={`Click to filter by platform: ${item.name} (${item.count} agents)`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                filters.platform === item.name
                  ? 'bg-google-red text-white border-google-red shadow-xs'
                  : 'bg-red-50 text-google-red border-red-200 hover:bg-red-100'
              }`}
            >
              {item.count} {formatPlatformName(item.name)}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
