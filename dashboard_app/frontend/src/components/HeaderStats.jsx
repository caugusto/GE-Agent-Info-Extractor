import React from 'react';
import { Bot, Users, Building2, Server, HelpCircle } from 'lucide-react';

export default function HeaderStats({ stats, filters, setFilters }) {
  if (!stats || Object.keys(stats).length === 0) return null;

  const total = stats.total_agents || 0;
  const shared = stats.total_shared || 0;
  const enterprise = stats.total_enterprise_wide || 0;
  const restricted = stats.total_restricted_shared || 0;
  const privateCount = stats.total_private || 0;

  const instancesBreakdown = stats.instances_breakdown || [];
  // Filter out any standalone / N/A instance records from Gemini Instances tile
  const realInstancesBreakdown = instancesBreakdown.filter(
    item => item.name && !item.name.startsWith('N/A')
  );
  const realInstanceCount = stats.distinct_instances_count ?? realInstancesBreakdown.length;

  const rawPlatformsBreakdown = stats.platforms_breakdown || [];
  const authorsBreakdown = stats.authors_breakdown || [];

  // Group platforms mapping helper
  const getGroupedPlatforms = (breakdown) => {
    const groups = {};
    
    breakdown.forEach(item => {
      const name = item.name || 'Unknown';
      let displayName = name;
      let rawNames = [name];

      if (name.includes('Agent Designer')) {
        displayName = 'Chat Agent (GE)';
      } else if (name.includes('Workflow Agent')) {
        displayName = 'Workflow Agent (GE)';
      } else if (name === 'Agent Runtime') {
        displayName = 'ADK Code';
      } else if (name === 'Cloud Run (A2A)') {
        displayName = 'Cloud Run';
      } else if (name === 'Google Built-in Agent' || name === 'Google Built-in Agent (A2A)' || name === 'Agent Registry (A2A)') {
        displayName = 'Google Built-in Agent';
        rawNames = ['Google Built-in Agent', 'Google Built-in Agent (A2A)', 'Agent Registry (A2A)'];
      }

      if (!groups[displayName]) {
        groups[displayName] = {
          displayName,
          count: 0,
          rawNames: []
        };
      }
      groups[displayName].count += item.count;
      rawNames.forEach(rn => {
        if (!groups[displayName].rawNames.includes(rn)) {
          groups[displayName].rawNames.push(rn);
        }
      });
    });

    return Object.values(groups).sort((a, b) => b.count - a.count);
  };

  const groupedPlatforms = getGroupedPlatforms(rawPlatformsBreakdown);
  const platformCount = groupedPlatforms.length;

  // Helper to toggle value in array filter or string filter
  const applyFilter = (key, value) => {
    setFilters(prev => {
      const current = prev[key];
      if (Array.isArray(current)) {
        if (current.includes(value)) {
          return { ...prev, [key]: current.filter(item => item !== value) };
        } else {
          return { ...prev, [key]: [...current, value] };
        }
      }
      return { ...prev, [key]: current === value ? '' : value };
    });
  };

  // Helper to handle grouped platform selection
  const handleGroupedPlatformClick = (group) => {
    setFilters(prev => {
      const current = prev.platform || [];
      const allSelected = group.rawNames.every(rn => current.includes(rn));
      if (allSelected) {
        return {
          ...prev,
          platform: current.filter(rn => !group.rawNames.includes(rn))
        };
      } else {
        const newPlats = new Set([...current, ...group.rawNames]);
        return {
          ...prev,
          platform: Array.from(newPlats)
        };
      }
    });
  };

  const isGroupSelected = (group) => {
    const current = filters.platform || [];
    if (!Array.isArray(current) || current.length === 0) return false;
    return group.rawNames.some(rn => current.includes(rn));
  };

  // Helper to check if value is selected in filter
  const isSelected = (key, value) => {
    const current = filters[key];
    if (Array.isArray(current)) return current.includes(value);
    return current === value;
  };

  // Format Standalone vs Instance Name
  const formatInstanceName = (name) => {
    if (!name) return 'Unknown';
    return name.replace('Gemini Enterprise: ', '');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      
      {/* 1. Total Agents Card */}
      <div 
        className="glass-panel glass-panel-hover p-6 md:p-7 rounded-2xl border-t-4 border-t-google-blue bg-white flex flex-col justify-between shadow-sm hover:shadow-md"
        title="Total count of all AI Agents, Reasoning Engines, and Cloud Run services discovered across the organization"
      >
        <div 
          onClick={() => setFilters(prev => ({ ...prev, author: '', platform: '', instance_name: '' }))}
          className="cursor-pointer group flex items-start justify-between"
          title="Click to reset author/platform/instance filters and show all agents"
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

        {/* Interactive Clickable Top Owners (Authors) Pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {authorsBreakdown.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyFilter('author', item.name)}
              title={`Click to filter by owner: ${item.name} (${item.count} agents)`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer max-w-full truncate ${
                filters.author === item.name
                  ? 'bg-google-blue text-white border-google-blue shadow-xs'
                  : 'bg-blue-50/80 text-google-blue border-blue-200 hover:bg-blue-100'
              }`}
            >
              {item.count} {item.name}
            </button>
          ))}
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
        title="Gemini Enterprise Instances: Total distinct Gemini Enterprise instances hosting agents"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              Gemini Instances
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </p>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 mt-2 tracking-tight">
              {realInstanceCount}
            </h3>
          </div>
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl shadow-xs">
            <Building2 className="w-8 h-8" />
          </div>
        </div>

        {/* Interactive Clickable Instance Pills with Hover Tooltips */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {realInstancesBreakdown.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyFilter('instance_name', item.name)}
              title={`Click to filter by instance: ${item.name} (${item.count} agents)`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isSelected('instance_name', item.name)
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
        title="Agent Platforms: Categorization of agents by platform architecture (Agent Designer No-Code, Agent Runtime, Cloud Run, Dialogflow, etc.)"
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
          {groupedPlatforms.map((group, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleGroupedPlatformClick(group)}
              title={`Click to filter by platform: ${group.displayName} (${group.count} agents)`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isGroupSelected(group)
                  ? 'bg-google-red text-white border-google-red shadow-xs'
                  : 'bg-red-50 text-google-red border-red-200 hover:bg-red-100'
              }`}
            >
              {group.count} {group.displayName}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
