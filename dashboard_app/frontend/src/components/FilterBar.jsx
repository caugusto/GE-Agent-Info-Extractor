import React from 'react';
import { Search, RotateCcw, Calendar, Filter, Share2, Globe, Building2, User, Server } from 'lucide-react';

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
        <div className="flex items-center gap-3 bg-slate-100/80 px-4 py-3 rounded-xl border border-slate-200">
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
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-google-blue focus:bg-white transition-colors"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs md:text-sm font-extrabold text-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <RotateCcw className="w-4 h-4 text-slate-600" />
          Reset All Filters
        </button>
      </div>

      {/* Middle Row: Multi-Select Dropdown Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 pt-4 border-t border-slate-200">
        
        {/* Project ID */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Project ID</label>
          <select
            value={filters.gcp_project_id || ''}
            onChange={(e) => handleChange('gcp_project_id', e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-google-blue focus:bg-white"
          >
            <option value="">All Projects</option>
            {(filterOptions.projects || []).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Gemini Enterprise Instance */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">GE Instance</label>
          <select
            value={filters.instance_name || ''}
            onChange={(e) => handleChange('instance_name', e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-google-blue focus:bg-white"
          >
            <option value="">All Instances</option>
            {(filterOptions.instances || []).map(inst => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>

        {/* Platform */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Platform</label>
          <select
            value={filters.platform || ''}
            onChange={(e) => handleChange('platform', e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-google-blue focus:bg-white"
          >
            <option value="">All Platforms</option>
            {(filterOptions.platforms || []).map(plat => (
              <option key={plat} value={plat}>{plat}</option>
            ))}
          </select>
        </div>

        {/* Is Shared */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Is Shared?</label>
          <select
            value={filters.is_shared === true ? 'true' : filters.is_shared === false ? 'false' : ''}
            onChange={(e) => {
              const val = e.target.value;
              handleChange('is_shared', val === 'true' ? true : val === 'false' ? false : '');
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-google-blue focus:bg-white"
          >
            <option value="">All Sharing</option>
            <option value="true">Yes (Shared)</option>
            <option value="false">No (Private)</option>
          </select>
        </div>

        {/* Enterprise Scope / Is Available To Everyone */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Enterprise-Wide?</label>
          <select
            value={filters.is_available_to_everyone === true ? 'true' : filters.is_available_to_everyone === false ? 'false' : ''}
            onChange={(e) => {
              const val = e.target.value;
              handleChange('is_available_to_everyone', val === 'true' ? true : val === 'false' ? false : '');
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-google-blue focus:bg-white"
          >
            <option value="">All Scopes</option>
            <option value="true">Enterprise (All Users)</option>
            <option value="false">Restricted / Private</option>
          </select>
        </div>

        {/* Access Scope String */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Scope Tag</label>
          <select
            value={filters.scope || ''}
            onChange={(e) => handleChange('scope', e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-google-blue focus:bg-white"
          >
            <option value="">All Scope Tags</option>
            {(filterOptions.scopes || []).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-google-blue focus:bg-white"
          >
            <option value="">All Statuses</option>
            {(filterOptions.statuses || []).map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Author Email */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Author Email</label>
          <select
            value={filters.author || ''}
            onChange={(e) => handleChange('author', e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:border-google-blue focus:bg-white"
          >
            <option value="">All Authors</option>
            {(filterOptions.authors || []).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom Row: Capability Toggle Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-3">
        <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mr-2">Capability Toggles:</span>

        <button
          type="button"
          onClick={() => handleToggle('uses_rag')}
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
