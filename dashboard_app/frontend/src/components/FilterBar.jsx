import React from 'react';
import { Search, Filter, RotateCcw, Calendar, Building2, Server, User, Globe, Tag } from 'lucide-react';

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
    <div className="glass-panel p-5 rounded-2xl mb-8 space-y-4">
      {/* Top Row: Collection Run Snapshot Selector + Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Collection Snapshot Selector */}
        <div className="flex items-center gap-3 bg-dark-card px-4 py-2.5 rounded-xl border border-dark-border">
          <Calendar className="w-5 h-5 text-google-blue shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Snapshot Run</span>
            <select
              value={selectedCollection || ''}
              onChange={(e) => setSelectedCollection(e.target.value ? parseInt(e.target.value) : null)}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer pr-4"
            >
              <option value="" className="bg-dark-card text-white">Latest Collection Run</option>
              {collections.map(col => (
                <option key={col.collection_id} value={col.collection_id} className="bg-dark-card text-white">
                  Run #{col.collection_id} — {col.timestamp ? col.timestamp.split('.')[0] : ''} ({col.agent_count} agents)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Agent Name, ID, Author Email, or Instructions..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-google-blue transition-colors"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-card hover:bg-dark-hover border border-dark-border hover:border-slate-600 rounded-xl text-xs font-semibold text-slate-300 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Filters
        </button>
      </div>

      {/* Middle Row: Multi-Select Dropdown Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-dark-border/50">
        
        {/* Project ID */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Project ID</label>
          <select
            value={filters.gcp_project_id || ''}
            onChange={(e) => handleChange('gcp_project_id', e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-google-blue"
          >
            <option value="">All Projects</option>
            {(filterOptions.projects || []).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Gemini Enterprise Instance */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">GE Instance</label>
          <select
            value={filters.instance_name || ''}
            onChange={(e) => handleChange('instance_name', e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-google-blue"
          >
            <option value="">All Instances</option>
            {(filterOptions.instances || []).map(inst => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>

        {/* Platform */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Platform</label>
          <select
            value={filters.platform || ''}
            onChange={(e) => handleChange('platform', e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-google-blue"
          >
            <option value="">All Platforms</option>
            {(filterOptions.platforms || []).map(plat => (
              <option key={plat} value={plat}>{plat}</option>
            ))}
          </select>
        </div>

        {/* Access Scope */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Access Scope</label>
          <select
            value={filters.scope || ''}
            onChange={(e) => handleChange('scope', e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-google-blue"
          >
            <option value="">All Scopes</option>
            {(filterOptions.scopes || []).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-google-blue"
          >
            <option value="">All Statuses</option>
            {(filterOptions.statuses || []).map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Author Email */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Author Email</label>
          <select
            value={filters.author || ''}
            onChange={(e) => handleChange('author', e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-google-blue"
          >
            <option value="">All Authors</option>
            {(filterOptions.authors || []).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom Row: Capability Toggle Switches */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capabilities:</span>

        <button
          type="button"
          onClick={() => handleToggle('uses_rag')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filters.uses_rag
              ? 'bg-google-green text-white shadow-lg shadow-google-green/20'
              : 'bg-dark-card border border-dark-border text-slate-400 hover:text-slate-200'
          }`}
        >
          Data Stores / RAG
        </button>

        <button
          type="button"
          onClick={() => handleToggle('uses_mcp')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filters.uses_mcp
              ? 'bg-google-red text-white shadow-lg shadow-google-red/20'
              : 'bg-dark-card border border-dark-border text-slate-400 hover:text-slate-200'
          }`}
        >
          Model Context Protocol (MCP)
        </button>

        <button
          type="button"
          onClick={() => handleToggle('uses_tools')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filters.uses_tools
              ? 'bg-google-yellow text-black font-bold shadow-lg shadow-google-yellow/20'
              : 'bg-dark-card border border-dark-border text-slate-400 hover:text-slate-200'
          }`}
        >
          External Tools
        </button>

        <button
          type="button"
          onClick={() => handleToggle('uses_code')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filters.uses_code
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-dark-card border border-dark-border text-slate-400 hover:text-slate-200'
          }`}
        >
          Python Sandbox / Code
        </button>
      </div>
    </div>
  );
}
