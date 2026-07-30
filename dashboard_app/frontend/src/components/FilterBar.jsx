import React from 'react';
import { Search, RotateCcw, Calendar } from 'lucide-react';
import MultiSelectFilter from './MultiSelectFilter';

export default function FilterBar({
  collections,
  selectedCollection,
  setSelectedCollection,
  filterOptions,
  filters,
  setFilters,
  onReset
}) {
  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleToggle = (field) => {
    setFilters(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="glass-panel p-6 md:p-7 rounded-2xl mb-8 space-y-6 bg-white border border-slate-200 shadow-sm">
      
      {/* Top Row: Collection Run Snapshot Selector + Search Bar + Reset Button */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Collection Snapshot Selector */}
        <div 
          className="flex items-center gap-3 bg-slate-100/80 px-4 py-3 rounded-xl border border-slate-200"
          title="Snapshot Run: Select a specific BigQuery extraction run timestamp to view historical inventory"
        >
          <Calendar className="w-5 h-5 text-google-blue shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] uppercase font-extrabold text-slate-500 tracking-wider">Snapshot Run</span>
            <select
              value={selectedCollection || ''}
              onChange={(e) => setSelectedCollection(e.target.value ? parseInt(e.target.value) : null)}
              className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer pr-4"
            >
              <option value="" className="bg-white text-slate-900">Latest Collection Run</option>
              {collections.map(col => (
                <option key={col.collection_id} value={col.collection_id} className="bg-white text-slate-900">
                  Run #{col.collection_id} — {col.timestamp ? col.timestamp.split('.')[0] : ''} ({col.agent_count} agents)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Agent Name, ID, Author Email, or Instructions..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            title="Global Search: Type agent name, agent ID, owner email, or prompt instructions"
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-google-blue focus:bg-white transition-colors"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={onReset}
          title="Reset All Filters: Clear all search terms, dropdown selections, and capability toggles"
          className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs md:text-sm font-extrabold text-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <RotateCcw className="w-4 h-4 text-slate-600" />
          Reset All Filters
        </button>
      </div>

      {/* Middle Row: Multi-Select Dropdown Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-4 border-t border-slate-200">
        
        {/* Project ID */}
        <MultiSelectFilter
          label="Project ID"
          options={filterOptions.projects || []}
          selected={filters.gcp_project_id || []}
          onChange={(val) => handleChange('gcp_project_id', val)}
          placeholder="All Projects"
        />

        {/* Gemini Enterprise Instance */}
        <MultiSelectFilter
          label="GE Instance"
          options={filterOptions.instances || []}
          selected={filters.instance_name || []}
          onChange={(val) => handleChange('instance_name', val)}
          placeholder="All Instances"
        />

        {/* Platform */}
        <MultiSelectFilter
          label="Platform"
          options={filterOptions.platforms || []}
          selected={filters.platform || []}
          onChange={(val) => handleChange('platform', val)}
          placeholder="All Platforms"
        />

        {/* Is Shared */}
        <div title="Is Shared: Filter whether an agent is shared with other users (Yes) or private (No)">
          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Is Shared?</label>
          <select
            value={filters.is_shared === true ? 'true' : filters.is_shared === false ? 'false' : ''}
            onChange={(e) => {
              const val = e.target.value;
              handleChange('is_shared', val === 'true' ? true : val === 'false' ? false : '');
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-google-blue focus:bg-white"
          >
            <option value="">All Sharing</option>
            <option value="true">Yes (Shared)</option>
            <option value="false">No (Private)</option>
          </select>
        </div>

        {/* Scope Tag */}
        <MultiSelectFilter
          label="Scope Tag"
          options={filterOptions.scopes || []}
          selected={filters.scope || []}
          onChange={(val) => handleChange('scope', val)}
          placeholder="All Scopes"
        />

        {/* Status */}
        <MultiSelectFilter
          label="Status"
          options={filterOptions.statuses || []}
          selected={filters.status || []}
          onChange={(val) => handleChange('status', val)}
          placeholder="All Statuses"
        />

        {/* Author Email */}
        <MultiSelectFilter
          label="Author Email"
          options={filterOptions.authors || []}
          selected={filters.author || []}
          onChange={(val) => handleChange('author', val)}
          placeholder="All Authors"
        />
      </div>

      {/* Bottom Row: Capability Toggle Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-3">
        <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mr-2">Capability Toggles:</span>

        <button
          type="button"
          onClick={() => handleToggle('uses_rag')}
          title="Data Stores / RAG: Filter agents attached to Knowledge Sources, Google Drive, Gmail, BQ, or Vertex AI Search"
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all border cursor-pointer ${
            filters.uses_rag
              ? 'bg-google-green text-white border-google-green shadow-xs'
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Data Stores / RAG
        </button>

        <button
          type="button"
          onClick={() => handleToggle('uses_mcp')}
          title="Model Context Protocol (MCP): Filter agents integrating external MCP server tools"
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all border cursor-pointer ${
            filters.uses_mcp
              ? 'bg-google-red text-white border-google-red shadow-xs'
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Model Context Protocol (MCP)
        </button>

        <button
          type="button"
          onClick={() => handleToggle('uses_tools')}
          title="External Tools: Filter agents with function calling, extension APIs, or external tool integrations"
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all border cursor-pointer ${
            filters.uses_tools
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}
        >
          External Tools
        </button>

        <button
          type="button"
          onClick={() => handleToggle('uses_code')}
          title="Python Sandbox / Code: Filter agents executing dynamic Python code in an isolated sandbox"
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all border cursor-pointer ${
            filters.uses_code
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Python Sandbox / Code
        </button>
      </div>
    </div>
  );
}
